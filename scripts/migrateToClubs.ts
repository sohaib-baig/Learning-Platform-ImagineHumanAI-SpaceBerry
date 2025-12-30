import * as admin from "firebase-admin";
import { readFileSync } from "fs";

type ClubInfo = {
  name: string;
  slug: string;
  description: string;
  vision: string;
  mission: string;
  bannerUrl?: string;
  benefits: string[];
  price: number;                // major units
  currency: string;             // "AUD"
  reviews?: any[];
  recommendedClubs: string[];
};

const DRY_RUN = process.env.DRY_RUN !== "false";             // default true
const HOST_UID_OVERRIDE = process.env.HOST_UID || "";        // optional explicit host uid
const ACADEMY_SLUG = process.env.ACADEMY_SLUG || "imaginehumans";
const ACADEMY_NAME = process.env.ACADEMY_NAME || "ImagineHumans Academy";
const DEFAULT_CURRENCY = process.env.CURRENCY || "AUD";
const DEFAULT_PRICE = Number(process.env.DEFAULT_PRICE || 0); // 0 means free for now
const INCLUDE_ALL_USERS_IN_ACADEMY = (process.env.INCLUDE_ALL_USERS_IN_ACADEMY || "false") === "true"; // conservative by default
const TARGET_CLUB_ID = process.env.TARGET_CLUB_ID || "oCuLKtZNA9mlC949ZHmW";

async function ensureAdmin() {
  if (!admin.apps.length) {
    const raw = readFileSync("./service-account.json", "utf8");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw) as any),
    });
  }
}

async function pickHostUid(db: FirebaseFirestore.Firestore): Promise<string> {
  if (HOST_UID_OVERRIDE) return HOST_UID_OVERRIDE;

  // Prefer any existing user with roles.host == true
  const hostSnap = await db.collection("users")
    .where("roles.host", "==", true)
    .limit(1)
    .get();

  if (!hostSnap.empty) return hostSnap.docs[0].id;

  // Fall back to any existing user (first one) and promote them as host (will update during backfill)
  const anyUser = await db.collection("users").limit(1).get();
  if (!anyUser.empty) return anyUser.docs[0].id;

  throw new Error("No users found to assign as initial host. Set HOST_UID env var.");
}

async function getOrCreateAcademyClub(db: FirebaseFirestore.Firestore, hostUid: string) {
  const clubsRef = db.collection("clubs");
  const info: ClubInfo = {
    name: ACADEMY_NAME,
    slug: ACADEMY_SLUG,
    description: "",
    vision: "",
    mission: "",
    benefits: [],
    price: DEFAULT_PRICE,
    currency: DEFAULT_CURRENCY,
    reviews: [],
    recommendedClubs: []
  };
  const payload = {
    info,
    hostId: hostUid,
    membersCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (TARGET_CLUB_ID) {
    const targetRef = clubsRef.doc(TARGET_CLUB_ID);
    const snapshot = await targetRef.get();
    if (snapshot.exists) {
      console.log(`[INFO] Using existing target club ${TARGET_CLUB_ID}`);
      return { id: targetRef.id, ref: targetRef };
    }

    if (DRY_RUN) {
      console.log(
        `[DRY_RUN] Would create target club ${TARGET_CLUB_ID} with payload:`,
        payload
      );
      return { id: TARGET_CLUB_ID, ref: targetRef };
    }

    await targetRef.set(payload);
    console.log(`[OK] Created target club with id ${TARGET_CLUB_ID}`);
    return { id: targetRef.id, ref: targetRef };
  }

  const existing = await clubsRef.where("info.slug", "==", ACADEMY_SLUG).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    console.log(`[INFO] Academy club already exists: ${doc.id}`);
    return { id: doc.id, ref: doc.ref };
  }

  if (DRY_RUN) {
    console.log("[DRY_RUN] Would create academy club:", payload);
    // return a fake ref for logging continuity
    const fake = clubsRef.doc("_dryrun_academy");
    return { id: fake.id, ref: fake };
  }

  const docRef = await clubsRef.add(payload);
  console.log(`[OK] Created academy club ${docRef.id}`);
  return { id: docRef.id, ref: docRef };
}

async function migrateJourneys(db: FirebaseFirestore.Firestore, academyId: string) {
  const srcJourneys = await db.collection("journeys").get();
  console.log(`[INFO] Found ${srcJourneys.size} journeys to migrate.`);
  for (const j of srcJourneys.docs) {
    const data = j.data();
    const target = db.collection("clubs").doc(academyId).collection("journeys").doc(j.id);
    if (DRY_RUN) {
      console.log(`[DRY_RUN] Journey ${j.id} -> clubs/${academyId}/journeys/${j.id}`);
    } else {
      await target.set({
        ...data,
        clubId: academyId,
        createdAt: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Subcollection: lessons
    const lessonsRef = db.collection("journeys").doc(j.id).collection("lessons");
    const lessonsSnap = await lessonsRef.get();
    for (const l of lessonsSnap.docs) {
      const ldata = l.data();
      const ltarget = target.collection("lessons").doc(l.id);
      if (DRY_RUN) {
        console.log(`[DRY_RUN] Lesson ${l.id} under journey ${j.id}`);
      } else {
        await ltarget.set({
          ...ldata,
          createdAt: ldata.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
  }
}

async function migrateLabsToDownloads(db: FirebaseFirestore.Firestore, academyId: string) {
  const labs = await db.collection("labs").get();
  console.log(`[INFO] Found ${labs.size} labs -> downloads.`);
  for (const d of labs.docs) {
    const data = d.data();
    const target = db.collection("clubs").doc(academyId).collection("downloads").doc(d.id);
    if (DRY_RUN) {
      console.log(`[DRY_RUN] Lab ${d.id} -> downloads`);
    } else {
      await target.set({
        title: data.title ?? d.id,
        url: data.url ?? "",
        description: data.description ?? "",
        createdAt: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
}

function ensureDefaultHostStatus(v: any) {
  if (v && typeof v === "object" && typeof v.enabled === "boolean") return v;
  return { enabled: true };
}

async function backfillUsers(db: FirebaseFirestore.Firestore, academyId: string, initialHostUid: string) {
  const users = await db.collection("users").get();
  console.log(`[INFO] Backfilling ${users.size} users.`);
  let membersCount = 0;

  for (const u of users.docs) {
    const data = u.data() as any;

    const roles = {
      user: data?.roles?.user ?? true,
      host: data?.roles?.host ?? false
    };

    const hostStatus = ensureDefaultHostStatus(data?.hostStatus);
    let clubsJoined: string[] = Array.isArray(data?.clubsJoined) ? [...data.clubsJoined] : [];
    let clubsHosted: string[] = Array.isArray(data?.clubsHosted) ? [...data.clubsHosted] : [];

    // Promote chosen initial host (if not already)
    if (u.id === initialHostUid) {
      roles.host = true;
      hostStatus.enabled = hostStatus.enabled ?? true;
      if (!clubsHosted.includes(academyId)) clubsHosted.push(academyId);
    }

    // Optionally add academy membership to all users (off by default)
    const shouldJoinAcademy = INCLUDE_ALL_USERS_IN_ACADEMY;
    if (shouldJoinAcademy && !clubsJoined.includes(academyId)) {
      clubsJoined.push(academyId);
      membersCount++;
    }

    const update = {
      roles,
      hostStatus,
      clubsJoined,
      clubsHosted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (DRY_RUN) {
      console.log(`[DRY_RUN] Update user ${u.id}`, update);
    } else {
      await u.ref.set(update, { merge: true });
    }
  }

  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would set membersCount=${membersCount} on clubs/${academyId}`);
  } else {
    await db.collection("clubs").doc(academyId).set({
      membersCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

(async () => {
  try {
    await ensureAdmin();
    const db = admin.firestore();

    const hostUid = await pickHostUid(db);
    console.log(`[OK] Initial host UID: ${hostUid}`);

    const { id: academyId } = await getOrCreateAcademyClub(db, hostUid);

    await migrateJourneys(db, academyId);
    await migrateLabsToDownloads(db, academyId);
    await backfillUsers(db, academyId, hostUid);

    console.log(`Migration complete ${DRY_RUN ? "(DRY_RUN)" : ""}.`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

