import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getServerStripeClient } from "@/lib/server-stripe";

type RouteParams = {
  clubId: string;
};

function jsonResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const clubId = params?.clubId?.trim();

  if (!clubId) {
    return jsonResponse("Club ID is required.", 400);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse("Unauthorized", 401);
  }

  const idToken = authHeader.replace("Bearer", "").trim();

  let uid: string;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (error) {
    console.error("[Leave Club] Invalid token", error);
    return jsonResponse("Unauthorized", 401);
  }

  try {
    const clubRef = adminDb.collection("clubs").doc(clubId);
    const userRef = adminDb.collection("users").doc(uid);

    const [clubSnap, userSnap] = await Promise.all([
      clubRef.get(),
      userRef.get(),
    ]);

    if (!clubSnap.exists) {
      return jsonResponse("Club not found.", 404);
    }

    if (!userSnap.exists) {
      return jsonResponse("User profile not found.", 404);
    }

    const clubData = clubSnap.data() as { hostId?: string };
    const userData = userSnap.data() as Record<string, unknown>;

    if (clubData?.hostId === uid) {
      return jsonResponse(
        "Hosts must deactivate their club before leaving.",
        403
      );
    }

    const clubsJoinedRaw = Array.isArray(userData?.clubsJoined)
      ? (userData.clubsJoined as unknown[])
      : [];
    const clubsJoined = clubsJoinedRaw.map((value) => String(value));

    if (!clubsJoined.includes(clubId)) {
      return jsonResponse("You are not a member of this club.", 409);
    }

    const membershipMap =
      (userData?.clubMemberships as Record<string, unknown>) || {};
    const membershipEntry = (membershipMap?.[clubId] || {}) as Record<
      string,
      unknown
    >;

    const stripeSubscriptionId =
      typeof membershipEntry?.stripeSubscriptionId === "string" &&
      membershipEntry.stripeSubscriptionId.trim().length > 0
        ? membershipEntry.stripeSubscriptionId
        : null;
    const existingFailures =
      typeof membershipEntry?.consecutiveFailedPayments === "number"
        ? membershipEntry.consecutiveFailedPayments
        : 0;

    if (stripeSubscriptionId) {
      const stripe = getServerStripeClient();
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === "resource_missing"
        ) {
          console.warn(
            "[Leave Club] Subscription already canceled in Stripe",
            stripeSubscriptionId
          );
        } else {
          console.error(
            "[Leave Club] Failed to cancel Stripe subscription",
            stripeSubscriptionId,
            error
          );
          return jsonResponse(
            "Unable to cancel billing at this time. Please try again shortly.",
            502
          );
        }
      }
    }

    const membershipUpdate = {
      status: "canceled",
      isTrialing: false,
      stripeSubscriptionId: stripeSubscriptionId ?? "",
      trialEndsAt: null,
      lastPaymentType: "member_cancelled",
      lastPaymentAt: FieldValue.serverTimestamp(),
      consecutiveFailedPayments: existingFailures,
    };

    await Promise.all([
      userRef.set(
        {
          clubsJoined: FieldValue.arrayRemove(clubId),
          clubMemberships: {
            [clubId]: membershipUpdate,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      clubRef.set(
        {
          membersCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      adminDb.collection("billingEvents").add({
        clubId,
        uid,
        eventType: "member_subscription_cancelled_by_member",
        stripeSubscriptionId: stripeSubscriptionId ?? "",
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return NextResponse.json({
      status: "left",
      message: "Membership cancelled successfully.",
    });
  } catch (error) {
    console.error("[Leave Club] Unexpected error", error);
    return jsonResponse("Unable to process your request.", 500);
  }
}



