import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import type { HostBillingTier } from "@/types/club";
import { adminDb } from "@/lib/firebase-admin";
import { serverEnv } from "@/lib/env-server";
import {
  applyHostPlanActivation,
  applyHostPlanCancellation,
} from "@/lib/db/onboarding";
import {
  getServerStripeClient,
  getTierForPriceId,
} from "@/lib/server-stripe";
import { HOST_PLAN_DEFAULT_TIER } from "@/lib/constants";

const webhookSecret = serverEnv.STRIPE_WEBHOOK_SECRET;

type HostPlanPhase = "trial" | "active" | "unknown";

function deriveHostPlanPhase(
  metadata?: Stripe.Metadata | null,
  subscriptionStatus?: Stripe.Subscription.Status | string | null
): HostPlanPhase {
  if (subscriptionStatus === "trialing") return "trial";
  if (subscriptionStatus === "active") return "active";
  
  const phase = metadata?.phase;
  if (phase === "trial" || phase === "active") return phase;
  return "unknown";
}

function normalizeStripeId(
  value:
    | string
    | Stripe.Customer
    | Stripe.Subscription
    | Stripe.PaymentIntent
    | Stripe.DeletedCustomer
    | null
    | undefined
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

async function handleDownloadCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const { clubId, uid, downloadId } = metadata;
  if (!clubId || !uid || !downloadId) {
    console.error("Missing download checkout metadata", session.id);
    return;
  }

  const purchaseRef = adminDb.doc(
    `clubs/${clubId}/downloads/${downloadId}/purchases/${uid}`
  );
  await purchaseRef.set(
    {
      status: "succeeded",
      amount: session.amount_total ?? 0,
      currency: (session.currency ?? "aud").toUpperCase(),
      stripe: {
        sessionId: session.id,
        paymentIntentId: normalizeStripeId(session.payment_intent) ?? "",
      },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await adminDb.collection("payments").add({
    uid,
    clubId,
    downloadId,
    type: "download",
    amount: session.amount_total ?? 0,
    currency: (session.currency ?? "aud").toUpperCase(),
    stripe: {
      sessionId: session.id,
      paymentIntentId: normalizeStripeId(session.payment_intent) ?? "",
      status: "succeeded",
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function handleClubMembershipCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const { clubId, uid } = metadata;
  if (!clubId || !uid) {
    console.error("Missing club checkout metadata", session.id);
    return;
  }

  await adminDb.doc(`users/${uid}`).set(
    {
      clubsJoined: FieldValue.arrayUnion(clubId),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await adminDb.doc(`clubs/${clubId}`).update({
    membersCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function logBillingEvent(
  clubId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  await adminDb.collection("billingEvents").add({
    clubId,
    eventType,
    createdAt: FieldValue.serverTimestamp(),
    ...payload,
  });
}

async function handleHostPlanCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const uid = metadata.uid;
  const clubId = metadata.clubId;
  if (!uid || !clubId) {
    console.error("Missing host plan checkout metadata", session.id);
    return;
  }

  const tier =
    (metadata.tier as HostBillingTier | undefined) ?? HOST_PLAN_DEFAULT_TIER;
  const phase = deriveHostPlanPhase(metadata, null);
  const amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
  const currency =
    (session.currency || metadata.priceCurrency || "aud").toUpperCase();
  const stripeCustomerId = normalizeStripeId(session.customer);
  const stripeSubscriptionId = normalizeStripeId(session.subscription);
  const eventType =
    phase === "trial" ? "host_plan_trial_started" : "host_plan_activated";

  await applyHostPlanActivation({
    uid,
    clubId,
    tier,
    stripeCustomerId,
    stripeSubscriptionId,
  });

  await logBillingEvent(clubId, eventType, {
    uid,
    phase,
    tier,
    amountCents,
    currency,
    sessionId: session.id,
    priceId: metadata.priceId || null,
    stripeCustomerId,
    stripeSubscriptionId,
  });
}

async function findClubContextBySubscription(subscriptionId: string) {
  const snapshot = await adminDb
    .collection("clubs")
    .where("billing.stripeSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as { hostId?: string };
  return {
    clubId: docSnap.id,
    uid: data.hostId,
  };
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  if (metadata.type && metadata.type !== "host_plan") {
    return;
  }

  const subscriptionId = subscription.id;
  const subscriptionStatus = subscription.status;
  const phase = deriveHostPlanPhase(metadata, subscriptionStatus);
  const lookup =
    (metadata.clubId && metadata.uid
      ? { clubId: metadata.clubId, uid: metadata.uid }
      : await findClubContextBySubscription(subscriptionId)) || null;

  if (!lookup?.clubId || !lookup?.uid) {
    console.warn("Unable to resolve club context for subscription", subscriptionId);
    return;
  }

  const tierFromPrice = getTierForPriceId(
    subscription.items?.data?.[0]?.price?.id ?? null
  );
  const tier =
    (metadata.tier as HostBillingTier | undefined) ??
    tierFromPrice ??
    HOST_PLAN_DEFAULT_TIER;

  await applyHostPlanActivation({
    uid: lookup.uid,
    clubId: lookup.clubId,
    tier,
    stripeCustomerId: normalizeStripeId(subscription.customer),
    stripeSubscriptionId: subscriptionId,
  });

  await logBillingEvent(lookup.clubId, "host_plan_subscription_updated", {
    uid: lookup.uid,
    tier,
    phase,
    amountCents: subscription.items?.data?.[0]?.price?.unit_amount ?? null,
    currency:
      subscription.items?.data?.[0]?.price?.currency?.toUpperCase() ||
      metadata.priceCurrency ||
      null,
    sessionId: null,
    priceId: subscription.items?.data?.[0]?.price?.id || metadata.priceId || null,
    stripeCustomerId: normalizeStripeId(subscription.customer),
    stripeSubscriptionId: subscriptionId,
    status: subscriptionStatus,
    trialEndsAt:
      typeof subscription.trial_end === "number"
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  if (metadata.type && metadata.type !== "host_plan") {
    return;
  }

  const subscriptionId = subscription.id;
  const lookup =
    (metadata.clubId && metadata.uid
      ? { clubId: metadata.clubId, uid: metadata.uid }
      : await findClubContextBySubscription(subscriptionId)) || null;

  if (!lookup?.clubId || !lookup?.uid) {
    console.warn("Unable to resolve club context for cancelled subscription", subscriptionId);
    return;
  }

  await applyHostPlanCancellation({
    uid: lookup.uid,
    clubId: lookup.clubId,
    downgradeReason: "subscription_cancelled",
  });

  await logBillingEvent(lookup.clubId, "host_plan_subscription_cancelled", {
    uid: lookup.uid,
    stripeSubscriptionId: subscriptionId,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const stripe = getServerStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = session.metadata?.type;
        if (type === "download") {
          await handleDownloadCheckout(session);
        } else if (type === "host_plan") {
          await handleHostPlanCheckout(session);
        } else {
          await handleClubMembershipCheckout(session);
        }
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("Payment failed for invoice", invoice.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
