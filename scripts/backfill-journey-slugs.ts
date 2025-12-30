import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { resolveJourneySlug } from "@/lib/journeys/slug";

const DRY_RUN = process.env.DRY_RUN !== "false"; // Default to dry-run for safety

interface JourneyDocData {
  title?: string;
  slug?: string;
}

async function backfillJourneySlugs() {
  const snapshot = await adminDb.collectionGroup("journeys").get();
  console.log(
    `[INFO] Inspecting ${snapshot.size} journey documents (${DRY_RUN ? "DRY_RUN" : "LIVE"})`
  );

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as JourneyDocData;
    const currentSlug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (currentSlug) {
      continue;
    }

    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) {
      skipped += 1;
      console.warn(
        `[SKIP] ${docSnap.ref.path} is missing a title; cannot derive slug`
      );
      continue;
    }

    const clubDocRef = docSnap.ref.parent.parent;
    const clubId = clubDocRef?.id;
    if (!clubId) {
      skipped += 1;
      console.warn(
        `[SKIP] Unable to determine clubId for journey at ${docSnap.ref.path}`
      );
      continue;
    }

    processed += 1;

    const slug = await adminDb.runTransaction(async (tx) => {
      const generated = await resolveJourneySlug(tx, clubId, title);
      if (!DRY_RUN) {
        tx.update(docSnap.ref, {
          slug: generated,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return generated;
    });

    console.log(
      `[${DRY_RUN ? "DRY_RUN" : "UPDATE"}] clubs/${clubId}/journeys/${docSnap.id} -> ${slug}`
    );
    if (!DRY_RUN) {
      updated += 1;
    }
  }

  console.log(
    `[INFO] Processed ${processed} journeys missing slugs (skipped ${skipped})`
  );
  console.log(
    `[INFO] ${DRY_RUN ? "Would update" : "Updated"} ${
      DRY_RUN ? processed : updated
    } journey documents`
  );
}

backfillJourneySlugs()
  .then(() => {
    console.log("[INFO] Journey slug backfill complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[ERROR] Journey slug backfill failed:", error);
    process.exit(1);
  });

