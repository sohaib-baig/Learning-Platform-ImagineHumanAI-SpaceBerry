import {
  getDoc,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import type { Club, ClubDoc } from "@/types/club";
import {
  evaluateClubBadges,
  getDefaultClubBadges,
  normalizeClubBadges,
} from "@/lib/badges";
import { clubDocRef } from "@/lib/firestorePaths";

export type ClubBadgesResult = ReturnType<typeof evaluateClubBadges>;

const extractTimestamp = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  // Firestore Timestamp with toDate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeDate = (value as any)?.toDate?.();
  if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toISOString();
  }
  return undefined;
};

const toEvaluableClub = (data: ClubDoc, id: string): Club => {
  const updatedAt = extractTimestamp(data.updatedAt) ?? new Date().toISOString();
  const createdAt = extractTimestamp(data.createdAt) ?? updatedAt;
  const badges = normalizeClubBadges(data.meta?.badges);

  return {
    id,
    info: {
      ...data.info,
      description: data.info.description ?? "",
      mission: data.info.mission ?? "",
      vision: data.info.vision ?? "",
      price: typeof data.info.price === "number" ? data.info.price : 0,
      currency: data.info.currency ?? "AUD",
      priceChangedAt:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.info as any)?.priceChangedAt?.toDate?.()?.toISOString?.() ??
        (typeof data.info.priceChangedAt === "string"
          ? data.info.priceChangedAt
          : undefined),
      reviews: data.info.reviews?.map((review) => ({
        ...review,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdAt: (review as any)?.createdAt?.toDate?.()?.toISOString?.() ?? review.createdAt,
      })),
    },
    hostId: data.hostId,
    membersCount: data.membersCount ?? 0,
    createdAt,
    updatedAt,
    meta: { badges },
  };
};

export async function ensureDefaultClubBadges(clubId: string): Promise<void> {
  const ref = clubDocRef<DocumentData>(clubId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`Club ${clubId} not found`);
  }

  const existing = snap.data() as ClubDoc;
  if (!existing.meta?.badges) {
    await setDoc(
      ref,
      { meta: { badges: getDefaultClubBadges() } },
      { merge: true }
    );
  }
}

export async function recomputeClubBadges(clubId: string): Promise<{
  updated: boolean;
  badges: ClubBadgesResult;
}> {
  const ref = clubDocRef<DocumentData>(clubId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`Club ${clubId} not found`);
  }

  const data = snap.data() as ClubDoc;
  const club = toEvaluableClub(data, clubId);
  const nextBadges = evaluateClubBadges(club);
  const currentBadges = normalizeClubBadges(data.meta?.badges);

  const changed =
    nextBadges.activeHost !== currentBadges.activeHost ||
    nextBadges.communityBuilder !== currentBadges.communityBuilder ||
    nextBadges.featuredByImagineHumans !== currentBadges.featuredByImagineHumans;

  if (changed) {
    await updateDoc(ref, { "meta.badges": nextBadges });
  }

  return { updated: changed, badges: nextBadges };
}
