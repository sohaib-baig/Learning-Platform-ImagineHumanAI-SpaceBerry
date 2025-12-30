import { getApps, initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Firestore,
  Timestamp,
} from "firebase-admin/firestore";
import { readFileSync } from "fs";

const DRY_RUN = process.env.DRY_RUN !== "false"; // default true

type LegacyRoles = string[] | { user?: boolean; host?: boolean; admin?: boolean };

interface LegacyUserDoc {
  roles?: LegacyRoles;
  hostStatus?: { enabled?: boolean; reasonDisabled?: string };
  clubsJoined?: unknown;
  clubsHosted?: unknown;
  country?: unknown;
  updatedAt?: Timestamp;
}

function ensureAdminApp(): Firestore {
  if (!getApps().length) {
    const raw = readFileSync("./service-account.json", "utf8");
    initializeApp({
      credential: cert(JSON.parse(raw)),
    });
  }
  return getFirestore();
}

function normaliseRoles(current: LegacyRoles | undefined): {
  value: { user: boolean; host: boolean; admin?: boolean };
  changed: boolean;
} {
  if (Array.isArray(current)) {
    const next = {
      user: true,
      host: current.includes("host"),
      admin: current.includes("admin") ? true : undefined,
    };
    return { value: next, changed: true };
  }

  const next = {
    user: current?.user ?? true,
    host: current?.host ?? false,
    admin: current?.admin,
  };

  const changed =
    typeof current !== "object" ||
    current === null ||
    current.user !== next.user ||
    current.host !== next.host ||
    current.admin !== next.admin;

  return { value: next, changed };
}

function normaliseClubList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

async function cleanup() {
  const db = ensureAdminApp();
  const snapshot = await db.collection("users").get();
  console.log(
    `[INFO] Found ${snapshot.size} user documents to inspect (${DRY_RUN ? "DRY_RUN" : "LIVE"})`
  );

  let updatesApplied = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as LegacyUserDoc;
    const update: Record<string, unknown> = {};
    let shouldUpdate = false;

    if ("country" in data) {
      update.country = FieldValue.delete();
      shouldUpdate = true;
    }

    const { value: rolesValue, changed: rolesChanged } = normaliseRoles(data.roles);
    if (rolesChanged) {
      update.roles = rolesValue;
      shouldUpdate = true;
    }

    if (!data.hostStatus) {
      update.hostStatus = { enabled: false };
      shouldUpdate = true;
    }

    if (!Array.isArray(data.clubsJoined)) {
      update.clubsJoined = normaliseClubList(data.clubsJoined);
      shouldUpdate = true;
    }

    if (!Array.isArray(data.clubsHosted)) {
      update.clubsHosted = normaliseClubList(data.clubsHosted);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      updatesApplied += 1;
      const payload = {
        ...update,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (DRY_RUN) {
        console.log("[DRY_RUN] Would update users/%s with %o", docSnap.id, payload);
      } else {
        await docSnap.ref.set(payload, { merge: true });
        console.log("[OK] Updated users/%s", docSnap.id);
      }
    }
  }

  console.log(
    `[INFO] ${DRY_RUN ? "Would update" : "Updated"} ${updatesApplied} user documents`
  );
}

cleanup()
  .then(() => {
    console.log("[INFO] Cleanup complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[ERROR] Cleanup failed:", error);
    process.exit(1);
  });


