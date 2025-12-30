import type { firestore } from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

const JOURNEY_SLUG_FALLBACK = "journey";
const JOURNEY_SLUG_MAX_ATTEMPTS = 20;

function normalizeForSlug(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function slugifyJourneyTitle(title: string): string {
  const normalized = normalizeForSlug(title.trim());
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 60);

  return slug || JOURNEY_SLUG_FALLBACK;
}

export async function ensureUniqueJourneySlug(
  tx: firestore.Transaction,
  clubId: string,
  desiredSlug: string
): Promise<string> {
  if (!clubId) {
    throw new Error("Club ID is required to generate a journey slug");
  }

  const baseSlug = desiredSlug || JOURNEY_SLUG_FALLBACK;
  let candidate = baseSlug;
  let suffix = 2;
  let attempts = 0;

  const journeysCollection = adminDb
    .collection("clubs")
    .doc(clubId)
    .collection("journeys");

  while (attempts < JOURNEY_SLUG_MAX_ATTEMPTS) {
    const query = journeysCollection.where("slug", "==", candidate).limit(1);
    const snapshot = await tx.get(query);

    if (snapshot.empty) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
    attempts += 1;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function resolveJourneySlug(
  tx: firestore.Transaction,
  clubId: string,
  title: string
): Promise<string> {
  const desiredSlug = slugifyJourneyTitle(title);
  return ensureUniqueJourneySlug(tx, clubId, desiredSlug);
}
