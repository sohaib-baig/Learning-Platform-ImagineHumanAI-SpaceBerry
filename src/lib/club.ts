import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { BillingAnalyticsResponse } from "@/types/analytics";
import type { Club, ClubDoc } from "@/types/club";
import { getDefaultClubBadges, normalizeClubBadges } from "@/lib/badges";

interface JoinFreeClubResponse {
  success: boolean;
  [key: string]: unknown;
}

const callable = httpsCallable<
  { clubId: string },
  JoinFreeClubResponse
>(functions, "joinFreeClub");

export async function joinFreeClub(clubId: string) {
  if (!clubId) {
    throw new Error("clubId is required to join a club");
  }

  const response = await callable({ clubId });
  return response.data;
}

export async function fetchClubBilling(
  clubId: string,
  month?: string
): Promise<BillingAnalyticsResponse | null> {
  if (!clubId) {
    throw new Error("clubId is required to load analytics");
  }

  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required");
  }

  const token = await currentUser.getIdToken();
  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }

  const query = params.toString();
  const response = await fetch(
    `/api/clubs/${clubId}/analytics/billing${query ? `?${query}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Failed to load billing analytics");
  }

  const payload = (await response.json()) as {
    analytics: BillingAnalyticsResponse | null;
  };

  return payload.analytics;
}

export const mapClubDoc = (
  docSnap: QueryDocumentSnapshot<DocumentData>
): Club => {
  const data = docSnap.data() as ClubDoc;
  const normalizedVideoUrl =
    typeof data.info.videoUrl === "string" ? data.info.videoUrl.trim() : "";
  const normalizedBadges = data.meta?.badges
    ? normalizeClubBadges(data.meta.badges)
    : getDefaultClubBadges();

  return {
    id: docSnap.id,
    info: {
      ...data.info,
      description: data.info.description ?? "",
      videoUrl: normalizedVideoUrl || undefined,
      price: typeof data.info.price === "number" ? data.info.price : 0,
      currency: data.info.currency ?? "AUD",
      priceChangedAt:
        data.info.priceChangedAt?.toDate?.()?.toISOString() ??
        (typeof data.info.priceChangedAt === "string"
          ? data.info.priceChangedAt
          : undefined),
      reviews: data.info.reviews?.map((review) => ({
        ...review,
        createdAt:
          review.createdAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
      })),
    },
    hostId: data.hostId,
    membersCount: typeof data.membersCount === "number" ? data.membersCount : 0,
    pricingLocked: data.pricingLocked ?? false,
    meta: { badges: normalizedBadges },
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
};
