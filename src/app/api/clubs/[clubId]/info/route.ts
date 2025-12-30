import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import type { firestore } from "firebase-admin";
import { clubInfoUpdateSchema } from "@/lib/validation/clubSchemas";
import { HostGuardError, requireEnabledHost } from "@/lib/server/hostGuard";
import { adminDb } from "@/lib/firebase-admin";
import type { Club, ClubDoc } from "@/types/club";
import { FIREBASE_REGION } from "@/lib/firebaseRegion";
import {
  enforcePaymentForFreeMembers,
  type RequirePaymentResult,
} from "../../../../../../shared/requirePaymentForFreeMembers";
import {
  writeMembershipAudit,
  type MembershipAuditEntry,
} from "../../../../../../shared/auditLogger";

async function callRequirePaymentForFreeMembersCallable(
  clubId: string,
  idToken: string
): Promise<RequirePaymentResult> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable."
    );
  }

  const url = `https://${FIREBASE_REGION}-${projectId}.cloudfunctions.net/requirePaymentForFreeMembers`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };

  const body = JSON.stringify({
    data: { clubId },
  });

  const invokeOnce = async (): Promise<RequirePaymentResult> => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const text = await response.text();
    let parsed: unknown = null;

    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(
          "Invalid response from requirePaymentForFreeMembers callable."
        );
      }
    }

    const parsedResult = parsed as {
      result?: RequirePaymentResult;
      error?: { status?: string; message?: string };
    } | null;

    if (!response.ok || parsedResult?.error) {
      const status = parsedResult?.error?.status ?? response.status;
      const message =
        parsedResult?.error?.message ??
        `Callable requirePaymentForFreeMembers failed with status ${response.status}`;
      const error = new Error(message) as Error & { code?: string };
      error.code =
        typeof status === "string" ? status : String(status ?? "UNKNOWN");
      throw error;
    }

    if (!parsedResult) {
      throw new Error(
        "Callable requirePaymentForFreeMembers returned an empty response."
      );
    }

    const resultPayload =
      parsedResult.result ?? (parsedResult as RequirePaymentResult | null);

    if (!resultPayload) {
      throw new Error(
        "Callable requirePaymentForFreeMembers missing result payload."
      );
    }

    return resultPayload;
  };

  try {
    return await invokeOnce();
  } catch (error) {
    console.warn("[RequirePayment] Callable retry", { clubId, error });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await invokeOnce();
  }
}

async function enforcePaymentForFreeMembersInline(
  clubId: string,
  hostUid: string
): Promise<RequirePaymentResult> {
  return await enforcePaymentForFreeMembers({
    clubId,
    hostUid,
    db: adminDb,
    logger: console,
    auditLogger: (entry: MembershipAuditEntry) =>
      writeMembershipAudit(adminDb, entry),
  });
}

type RouteParams = {
  clubId: string;
};

function dedupeAndClean(values: string[], limit: number) {
  return Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    )
  ).slice(0, limit);
}

function serializeClubDoc(snapshot: firestore.DocumentSnapshot<ClubDoc>): Club {
  const data = snapshot.data();
  if (!data) {
    throw new Error("Club data missing when trying to serialize");
  }

  const normalizedVideoUrl =
    typeof data.info.videoUrl === "string" ? data.info.videoUrl.trim() : "";
  const reviews =
    data.info.reviews?.map((review) => ({
      ...review,
      createdAt:
        review.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    })) ?? [];

  return {
    id: snapshot.id,
    info: {
      ...data.info,
      description: data.info.description ?? "",
      vision: data.info.vision ?? "",
      mission: data.info.mission ?? "",
      videoUrl: normalizedVideoUrl || undefined,
      benefits: Array.isArray(data.info.benefits) ? data.info.benefits : [],
      price: typeof data.info.price === "number" ? data.info.price : 0,
      currency: data.info.currency ?? "AUD",
      recommendedClubs: Array.isArray(data.info.recommendedClubs)
        ? data.info.recommendedClubs
        : [],
      reviews,
      priceChangedAt:
        data.info.priceChangedAt?.toDate?.()?.toISOString() ??
        (typeof data.info.priceChangedAt === "string"
          ? data.info.priceChangedAt
          : undefined),
    },
    hostId: data.hostId,
    membersCount: data.membersCount ?? 0,
    pricingLocked: data.pricingLocked ?? false,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  try {
    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    const hostContext = await requireEnabledHost(request, clubId);
    const hostUid = hostContext.uid;
    const hostIdToken = hostContext.token;

    const rawBody = await request.json();
    const parsedBody = clubInfoUpdateSchema.parse(rawBody);

    const name = parsedBody.name.trim();
    const description = parsedBody.description.trim();
    const mission = parsedBody.mission.trim();
    const vision = parsedBody.vision.trim();
    const currency = parsedBody.currency.trim().toUpperCase();
    const price = Math.round(parsedBody.price * 100) / 100;
    const profileImageUrl = parsedBody.profileImageUrl?.trim() ?? null;
    const videoUrlProvided = Object.prototype.hasOwnProperty.call(
      parsedBody,
      "videoUrl"
    );
    const videoUrl = parsedBody.videoUrl?.trim() ?? "";

    const benefits = dedupeAndClean(parsedBody.benefits, 10);

    const recommendedClubs = dedupeAndClean(
      parsedBody.recommendedClubs,
      10
    ).filter((id) => id !== clubId);

    if (recommendedClubs.length > 0) {
      const clubRefs = recommendedClubs.map((id) =>
        adminDb.collection("clubs").doc(id)
      );
      const snapshots = await Promise.all(clubRefs.map((ref) => ref.get()));

      const missingClubIds = snapshots
        .map((snap, index) => (!snap.exists ? recommendedClubs[index] : null))
        .filter((value): value is string => Boolean(value));

      if (missingClubIds.length > 0) {
        return NextResponse.json(
          {
            error: "Some recommended clubs do not exist",
            missingClubIds,
          },
          { status: 400 }
        );
      }
    }

    const clubRef = adminDb.collection("clubs").doc(clubId);
    const existingSnap = await clubRef.get();

    if (!existingSnap.exists) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const existingData = existingSnap.data() as ClubDoc | undefined;
    const oldPrice =
      typeof existingData?.info?.price === "number"
        ? existingData.info.price
        : 0;

    if (price < 0) {
      console.warn(
        `[PriceLock] Rejected negative price: club ${clubId}, oldPrice=${oldPrice}, newPrice=${price}`
      );
      return NextResponse.json(
        { error: "Price cannot be negative." },
        { status: 400 }
      );
    }

    if (oldPrice > 0 && price <= 0) {
      console.warn(
        `[PriceLock] Prevented revert: club ${clubId}, oldPrice=${oldPrice}, newPrice=${price}`
      );
      return NextResponse.json(
        { error: "Once a club has a price, it cannot be reverted to free." },
        { status: 400 }
      );
    }

    const priceBecomesPaid = oldPrice === 0 && price > 0;
    if (priceBecomesPaid) {
      const refreshedSnap = await clubRef.get();
      const refreshedData = refreshedSnap.data() as ClubDoc | undefined;

      if (refreshedData?.pricingLocked === true) {
        console.log("[RequirePayment] Trigger skipped - already locked", {
          clubId,
          uid: hostUid,
        });
      } else {
        let migrationResult: RequirePaymentResult | null = null;

        if (!hostIdToken) {
          console.warn("[RequirePayment] Missing host token for callable", {
            clubId,
            uid: hostUid,
          });
        } else {
          try {
            migrationResult = await callRequirePaymentForFreeMembersCallable(
              clubId,
              hostIdToken
            );
          } catch (error) {
            const rawCode = (error as { code?: string | number } | undefined)
              ?.code;
            const code =
              typeof rawCode === "number"
                ? String(rawCode)
                : (rawCode ?? "UNKNOWN");

            console.warn("[RequirePayment] Callable trigger failed", {
              clubId,
              uid: hostUid,
              code,
              error,
            });

            if (code === "PERMISSION_DENIED" || code === "403") {
              console.warn("[RequirePayment] Trigger denied", {
                clubId,
                uid: hostUid,
              });
            }
          }
        }

        if (!migrationResult) {
          console.warn("[RequirePayment] Falling back to inline enforcement", {
            clubId,
            uid: hostUid,
          });

          try {
            migrationResult = await enforcePaymentForFreeMembersInline(
              clubId,
              hostUid
            );
          } catch (error) {
            console.warn("[RequirePayment] Inline enforcement failed", {
              clubId,
              uid: hostUid,
              error,
            });

            return NextResponse.json(
              {
                error:
                  "Failed to require payment for existing members. Your price was not updated.",
              },
              { status: 502 }
            );
          }
        }

        if (migrationResult.partial) {
          console.warn("[RequirePayment] Partial migration detected", {
            clubId,
            uid: hostUid,
            result: migrationResult,
          });

          return NextResponse.json(
            {
              error:
                "Updated only part of the membership list. Please retry in a moment.",
            },
            { status: 503 }
          );
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      "info.name": name,
      "info.description": description,
      "info.mission": mission,
      "info.vision": vision,
      "info.benefits": benefits,
      "info.price": price,
      "info.currency": currency,
      "info.recommendedClubs": recommendedClubs,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (profileImageUrl !== null) {
      updatePayload["info.profileImageUrl"] = profileImageUrl;
    }

    if (videoUrlProvided) {
      updatePayload["info.videoUrl"] = videoUrl
        ? videoUrl
        : FieldValue.delete();
    }

    await clubRef.update(updatePayload);

    const updatedSnap = await clubRef.get();

    return NextResponse.json({
      club: serializeClubDoc(
        updatedSnap as firestore.DocumentSnapshot<ClubDoc>
      ),
    });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[ClubInfo PATCH] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update club info" },
      { status: 500 }
    );
  }
}
