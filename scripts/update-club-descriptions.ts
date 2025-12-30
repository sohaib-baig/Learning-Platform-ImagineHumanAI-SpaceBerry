import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DRY_RUN = process.env.DRY_RUN !== "false"; // default true to prevent accidental writes
const DEFAULT_TEMPLATE =
  process.env.DESCRIPTION_TEMPLATE ??
  "We're refreshing this space soon. {name} is gearing up to share more about why members love this club.";

if (!getApps().length) {
  initializeApp({
    credential: cert(require("../service-account.json")),
  });
}

const db = getFirestore();

function buildDescription(name?: string): string {
  const safeName = name?.trim() || "This club";
  return DEFAULT_TEMPLATE.replace("{name}", safeName);
}

async function backfillDescriptions() {
  console.log(
    `[INFO] Starting club description backfill (${DRY_RUN ? "DRY_RUN" : "LIVE"})`
  );

  const snapshot = await db.collection("clubs").get();
  console.log(`[INFO] Found ${snapshot.size} clubs to inspect.`);

  if (snapshot.empty) {
    console.log("[INFO] No clubs found. Nothing to update.");
    return;
  }

  let updatedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const info = data?.info ?? {};

    const nextDescription = buildDescription(info.name);

    if (!DRY_RUN) {
      await docSnap.ref.update({
        "info.description": nextDescription,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    updatedCount += 1;
    console.log(
      `${DRY_RUN ? "[DRY_RUN]" : "[UPDATED]"} clubs/${
        docSnap.id
      } -> description="${nextDescription}"`
    );
  }

  console.log(
    `[INFO] ${DRY_RUN ? "Would update" : "Updated"} ${updatedCount} clubs.`
  );
}

backfillDescriptions()
  .then(() => {
    console.log("[INFO] Club description backfill complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[ERROR] Failed to backfill club descriptions:", error);
    process.exit(1);
  });


