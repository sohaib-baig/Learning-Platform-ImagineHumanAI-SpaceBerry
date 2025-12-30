import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { FIREBASE_REGION } from "../../shared/firebaseRegion";
import { logMembershipAudit } from "./auditLogger";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ClubMembershipDoc {
  status?: string;
  lastPaymentType?: string;
}

interface BillingEventProps {
  clubId: string;
  userId: string;
  amount: number;
  currency: string;
  type: BillingEventType;
  isTrialConversion?: boolean;
  stripeId?: string;
}

interface BillingAnalyticsIncrements {
  newSubscribers?: number;
  activeSubscribers?: number;
  trialConversions?: number;
  totalRevenue?: number;
  cancellations?: number;
  trialStarts?: number;
}

interface BillingAnalyticsEventInput extends BillingEventProps {
  increments: BillingAnalyticsIncrements;
  timestamp?: admin.firestore.Timestamp;
  mode?: "add" | "subtract";
}

interface TrialConfigOptions {
  uid: string;
  clubId: string;
  pricingLocked?: boolean;
  defaultTrialDays?: number;
}

interface ClubBillingConfig {
  transactionFeePercent?: number;
}

interface HostTierConfig {
  tier: HostBillingTier;
  monthlyPriceAud: number;
  transactionFeePercent: number;
  includedPayingMembers: number;
  upgradeMembersThreshold: number;
  downgradeMembersThreshold: number;
  softLimits: {
    payingMembers: number;
    videoUploads: number;
    bandwidthGb: number;
  };
}

interface HostPlanActivationPayload {
  uid: string;
  clubId: string;
  tier: HostBillingTier;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

interface HostPlanCancellationPayload {
  uid: string;
  clubId: string;
  downgradeReason?: string;
}

type BillingEventType =
  | "subscription_created"
  | "trial_started"
  | "trial_converted"
  | "invoice_paid"
  | "subscription_canceled"
  | "refund_issued";

type HostBillingTier = "tier_a" | "tier_b" | "tier_c";

type SubscriptionDetailsPayload = {
  subscription?: string | Stripe.Subscription | null;
  metadata?: Stripe.Metadata | null;
} | null;

const BILLING_EVENT_NAMES: Record<BillingEventType, string> = {
  subscription_created: "Subscription Created",
  trial_started: "Trial Started",
  trial_converted: "Trial Converted",
  invoice_paid: "Invoice Paid",
  subscription_canceled: "Subscription Canceled",
  refund_issued: "Refund Issued",
};

const AMPLITUDE_ENDPOINT = "https://api2.amplitude.com/2/httpapi";

// Set region for all functions
const region = FIREBASE_REGION;

// Initialize Stripe with secret key from Firebase config
const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
});

const HOST_PLAN_WARNING_HOURS = 48;
const HOST_PLAN_SOFT_LIMIT_GRACE = {
  preUpgradeCheckDays: 7,
  autoUpgradeDays: 14,
  downgradeCooldownDays: 30,
};

const hostTierPriceIds: Record<HostBillingTier, string> = {
  tier_a:
    process.env.STRIPE_PRICE_ID_TIER_A ||
    functions.config().stripe?.price_tier_a ||
    "",
  tier_b:
    process.env.STRIPE_PRICE_ID_TIER_B ||
    functions.config().stripe?.price_tier_b ||
    "",
  tier_c:
    process.env.STRIPE_PRICE_ID_TIER_C ||
    functions.config().stripe?.price_tier_c ||
    "",
};

const HOST_BILLING_TIERS: Record<HostBillingTier, HostTierConfig> = {
  tier_a: {
    tier: "tier_a",
    monthlyPriceAud: 49.99,
    transactionFeePercent: 5,
    includedPayingMembers: 100,
    upgradeMembersThreshold: 100,
    downgradeMembersThreshold: 100,
    softLimits: {
      payingMembers: 99,
      videoUploads: 50,
      bandwidthGb: 300,
    },
  },
  tier_b: {
    tier: "tier_b",
    monthlyPriceAud: 99,
    transactionFeePercent: 3,
    includedPayingMembers: 500,
    upgradeMembersThreshold: 500,
    downgradeMembersThreshold: 100,
    softLimits: {
      payingMembers: 499,
      videoUploads: 200,
      bandwidthGb: 2000,
    },
  },
  tier_c: {
    tier: "tier_c",
    monthlyPriceAud: 199,
    transactionFeePercent: 2,
    includedPayingMembers: Number.MAX_SAFE_INTEGER,
    upgradeMembersThreshold: Number.MAX_SAFE_INTEGER,
    downgradeMembersThreshold: 500,
    softLimits: {
      payingMembers: Number.MAX_SAFE_INTEGER,
      videoUploads: 1000,
      bandwidthGb: 10000,
    },
  },
};

function getAmplitudeApiKey(): string {
  return (
    process.env.AMPLITUDE_SERVER_API_KEY ||
    functions.config().amplitude?.server_api_key ||
    ""
  );
}

async function resolveTrialConfig({
  uid,
  clubId,
  pricingLocked,
  defaultTrialDays = 7,
}: TrialConfigOptions): Promise<{
  trialDays: number;
  noTrial: boolean;
  membership?: ClubMembershipDoc | null;
  overrideReason?: string | null;
}> {
  if (!uid || !clubId) {
    return { trialDays: defaultTrialDays, noTrial: false };
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const membership = (userSnap.data()?.clubMemberships || {})[clubId] as
    | ClubMembershipDoc
    | undefined;

  const hasReturningFlag =
    membership?.lastPaymentType === "free_expired" ||
    membership?.status === "payment_required";

  let trialDays = defaultTrialDays;
  let noTrial = false;
  let overrideReason: string | null = null;

  if (hasReturningFlag && pricingLocked === false) {
    overrideReason = "pricing_unlocked_trial_override";
    console.log("[Billing] Trial override due to unlocked pricing", {
      uid,
      clubId,
    });
  } else if (hasReturningFlag) {
    trialDays = 0;
    noTrial = true;

    console.log("[Billing] No trial due to returning flag", {
      uid,
      clubId,
      hasReturningFlag,
      pricingLocked,
    });
  }

  return {
    trialDays,
    noTrial,
    membership: membership ?? null,
    overrideReason,
  };
}

function getBillingAnalyticsRefs(
  clubId: string,
  timestamp: admin.firestore.Timestamp
): {
  docRef: FirebaseFirestore.DocumentReference;
  monthKey: string;
} {
  const date = timestamp.toDate();
  const monthKey = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
  const docRef = db.doc(`clubs/${clubId}/analytics_billing/${monthKey}`);
  return { docRef, monthKey };
}

async function updateBillingAnalytics(
  docRef: FirebaseFirestore.DocumentReference,
  payload: {
    currency: string;
  } & BillingAnalyticsIncrements,
  mode: "add" | "subtract" = "add"
): Promise<void> {
  const direction = mode === "add" ? 1 : -1;
  const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
    currency: payload.currency.toUpperCase(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  (
    [
      "newSubscribers",
      "activeSubscribers",
      "trialConversions",
      "totalRevenue",
      "cancellations",
      "trialStarts",
    ] as const
  ).forEach((field) => {
    const value = payload[field];
    if (typeof value === "number" && value !== 0) {
      update[field] = admin.firestore.FieldValue.increment(value * direction);
    }
  });

  await docRef.set(update, { merge: true });
}

async function mirrorBillingEventToAmplitude(
  event: BillingEventProps
): Promise<void> {
  const apiKey = getAmplitudeApiKey();
  if (!apiKey) {
    return;
  }

  try {
    const now = Date.now();
    const response = await fetch(AMPLITUDE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        events: [
          {
            event_type: BILLING_EVENT_NAMES[event.type] ?? event.type,
            user_id: event.userId,
            time: now,
            insert_id: `${event.type}-${event.userId}-${now}-${Math.random()
              .toString(36)
              .slice(2)}`,
            event_properties: {
              clubId: event.clubId,
              amount: event.amount,
              currency: event.currency,
              stripeId: event.stripeId ?? null,
              isTrialConversion: Boolean(event.isTrialConversion),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[Billing] Analytics mirror failed", {
        status: response.status,
        type: event.type,
      });
    }
  } catch (error) {
    console.error("[Billing] Analytics mirror failed", {
      error,
      type: event.type,
    });
  }
}

async function recordBillingAnalyticsEvent({
  clubId,
  userId,
  amount,
  currency,
  type,
  increments,
  timestamp = admin.firestore.Timestamp.now(),
  mode = "add",
  isTrialConversion,
  stripeId,
}: BillingAnalyticsEventInput): Promise<void> {
  const { docRef, monthKey } = getBillingAnalyticsRefs(clubId, timestamp);
  const hasIncrement = (
    [
      "newSubscribers",
      "activeSubscribers",
      "trialConversions",
      "totalRevenue",
    ] as const
  ).some(
    (field) => typeof increments[field] === "number" && increments[field] !== 0
  );

  if (hasIncrement) {
    try {
      await updateBillingAnalytics(
        docRef,
        {
          currency,
          ...increments,
        },
        mode
      );
    } catch (error) {
      console.error("[Billing] Analytics write failed", {
        clubId,
        monthKey,
        type,
        error,
      });
    }
  }

  await mirrorBillingEventToAmplitude({
    clubId,
    userId,
    amount,
    currency,
    type,
    isTrialConversion,
    stripeId,
  });
}

async function hasProcessedCheckoutSession(
  sessionId: string
): Promise<boolean> {
  if (!sessionId) {
    return false;
  }
  const snapshot = await db
    .collection("payments")
    .where("stripe.sessionId", "==", sessionId)
    .limit(1)
    .get();
  return !snapshot.empty;
}

function assertPriceIds() {
  (Object.entries(hostTierPriceIds) as [HostBillingTier, string][]).forEach(
    ([tier, priceId]) => {
      if (!priceId) {
        throw new Error(`Missing Stripe price ID for ${tier}`);
      }
    }
  );
}
assertPriceIds();

function computePlatformHostSplit(
  amountCents: number,
  billing?: ClubBillingConfig | null
) {
  // current platform fee percentage
  const defaultPlatformFeePercent = 5;

  const platformFeePercent =
    typeof billing?.transactionFeePercent === "number"
      ? billing.transactionFeePercent
      : defaultPlatformFeePercent;

  const platformFeeAmount = Math.round(
    amountCents * (platformFeePercent / 100)
  );
  const hostAmount = amountCents - platformFeeAmount;

  return {
    platformFeePercent,
    platformFeeAmount,
    hostAmount,
  };
}

function resolveTierConfig(tier?: HostBillingTier): HostTierConfig {
  if (tier && HOST_BILLING_TIERS[tier]) {
    return HOST_BILLING_TIERS[tier];
  }
  return HOST_BILLING_TIERS.tier_a;
}

function getTierForPriceId(priceId?: string | null): HostBillingTier | null {
  if (!priceId) {
    return null;
  }
  const match = (
    Object.entries(hostTierPriceIds) as [HostBillingTier, string][]
  ).find(([, value]) => value === priceId);
  return match ? match[0] : null;
}

function getNextTier(tier: HostBillingTier): HostBillingTier | null {
  if (tier === "tier_a") return "tier_b";
  if (tier === "tier_b") return "tier_c";
  return null;
}

function getPreviousTier(tier: HostBillingTier): HostBillingTier | null {
  if (tier === "tier_c") return "tier_b";
  if (tier === "tier_b") return "tier_a";
  return null;
}

async function applyHostPlanActivationAdmin({
  uid,
  clubId,
  tier,
  stripeCustomerId,
  stripeSubscriptionId,
}: HostPlanActivationPayload) {
  const tierConfig = resolveTierConfig(tier);
  const userRef = db.doc(`users/${uid}`);
  const clubRef = db.doc(`clubs/${clubId}`);

  await db.runTransaction(async (tx) => {
    const [userSnap, clubSnap] = await tx.getAll(userRef, clubRef);
    if (!userSnap.exists) {
      throw new Error(`User ${uid} not found`);
    }
    if (!clubSnap.exists) {
      throw new Error(`Club ${clubId} not found`);
    }

    const userData = userSnap.data() || {};
    const clubData = clubSnap.data() || {};
    const hostId = clubData.hostId;

    if (!hostId) {
      throw new Error(
        `Club ${clubId} does not have a host assigned; cannot activate plan`
      );
    }
    if (hostId !== uid) {
      throw new Error(
        `User ${uid} is not authorized to activate a plan for club ${clubId}`
      );
    }

    const billingPaths: Record<string, unknown> = {
      "billing.tier": tierConfig.tier,
      "billing.transactionFeePercent": tierConfig.transactionFeePercent,
      "billing.softLimits": tierConfig.softLimits,
      "billing.usage": {
        ...(clubData.billing?.usage ?? {}),
        payingMembers: clubData.membersCount ?? 0,
      },
      "billing.upgradeScheduledFor": admin.firestore.FieldValue.delete(),
      "billing.downgradeEligibleAfter": admin.firestore.FieldValue.delete(),
      "billing.upgradeReason": admin.firestore.FieldValue.delete(),
      "billing.warningEmailSentAt": admin.firestore.FieldValue.delete(),
    };

    if (stripeCustomerId) {
      billingPaths["billing.stripeCustomerId"] = stripeCustomerId;
    }
    if (stripeSubscriptionId) {
      billingPaths["billing.stripeSubscriptionId"] = stripeSubscriptionId;
    }

    tx.update(clubRef, {
      planType: tierConfig.tier,
      billingTier: tierConfig.tier,
      maxMembers: tierConfig.includedPayingMembers,
      memberCost: clubData.memberCost ?? 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...billingPaths,
    });

    const onboardingHostStatus: Record<string, unknown> = {
      ...(userData.onboarding?.hostStatus ?? {}),
      activated: true,
      pendingActivation: false,
      clubId,
      billingTier: tierConfig.tier,
    };
    if (stripeCustomerId) {
      onboardingHostStatus.stripeCustomerId = stripeCustomerId;
    }
    if (stripeSubscriptionId) {
      onboardingHostStatus.stripeSubscriptionId = stripeSubscriptionId;
    }

    const onboardingUpdate: Record<string, unknown> = {
      ...(userData.onboarding ?? {}),
      hostStatus: onboardingHostStatus,
    };

    onboardingUpdate.progress = {
      ...(userData.onboarding?.progress ?? {}),
      currentStep: "host:plan-active",
      lastStepCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt:
        userData.onboarding?.progress?.startedAt ??
        admin.firestore.FieldValue.serverTimestamp(),
    };

    const nextHostStatus: Record<string, unknown> = {
      ...(userData.hostStatus ?? {}),
      enabled: true,
      billingTier: tierConfig.tier,
    };
    if (stripeCustomerId) {
      nextHostStatus.stripeCustomerId = stripeCustomerId;
    }
    if (stripeSubscriptionId) {
      nextHostStatus.stripeSubscriptionId = stripeSubscriptionId;
    }

    tx.update(userRef, {
      onboarding: onboardingUpdate,
      hostStatus: nextHostStatus,
      roles: {
        ...(userData.roles ?? { user: true }),
        user: true,
        host: true,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function applyHostPlanCancellationAdmin({
  uid,
  clubId,
  downgradeReason = "subscription_cancelled",
}: HostPlanCancellationPayload) {
  const tierConfig = resolveTierConfig();
  const userRef = db.doc(`users/${uid}`);
  const clubRef = db.doc(`clubs/${clubId}`);

  await db.runTransaction(async (tx) => {
    const [userSnap, clubSnap] = await tx.getAll(userRef, clubRef);
    if (!userSnap.exists) {
      throw new Error(`User ${uid} not found`);
    }
    if (!clubSnap.exists) {
      throw new Error(`Club ${clubId} not found`);
    }
    const userData = userSnap.data() || {};
    const clubData = clubSnap.data() || {};
    if (clubData.hostId && clubData.hostId !== uid) {
      throw new Error(`User ${uid} is not authorized to manage club ${clubId}`);
    }

    const clubUpdate: Record<string, unknown> = {
      planType: tierConfig.tier,
      billingTier: tierConfig.tier,
      maxMembers: tierConfig.includedPayingMembers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      "billing.tier": tierConfig.tier,
      "billing.transactionFeePercent": tierConfig.transactionFeePercent,
      "billing.softLimits": tierConfig.softLimits,
      "billing.usage": {
        ...(clubData.billing?.usage ?? {}),
        payingMembers: clubData.membersCount ?? 0,
      },
      "billing.upgradeScheduledFor": admin.firestore.FieldValue.delete(),
      "billing.downgradeEligibleAfter": admin.firestore.FieldValue.delete(),
      "billing.upgradeReason": admin.firestore.FieldValue.delete(),
      "billing.warningEmailSentAt": admin.firestore.FieldValue.delete(),
      "billing.stripeSubscriptionId": admin.firestore.FieldValue.delete(),
    };

    if (downgradeReason) {
      clubUpdate["billing.downgradeReason"] = downgradeReason;
    } else {
      clubUpdate["billing.downgradeReason"] =
        admin.firestore.FieldValue.delete();
    }

    tx.update(clubRef, clubUpdate);

    const onboardingHostStatus: Record<string, unknown> = {
      ...(userData.onboarding?.hostStatus ?? {}),
      activated: false,
      pendingActivation: false,
      billingTier: tierConfig.tier,
    };
    onboardingHostStatus.stripeSubscriptionId =
      admin.firestore.FieldValue.delete();
    onboardingHostStatus.upgradeScheduledFor =
      admin.firestore.FieldValue.delete();
    onboardingHostStatus.downgradeEligibleAfter =
      admin.firestore.FieldValue.delete();

    const onboardingUpdate: Record<string, unknown> = {
      ...(userData.onboarding ?? {}),
      hostStatus: onboardingHostStatus,
    };

    onboardingUpdate.progress = {
      ...(userData.onboarding?.progress ?? {}),
      currentStep: "host:plan-cancelled",
      lastStepCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt:
        userData.onboarding?.progress?.startedAt ??
        admin.firestore.FieldValue.serverTimestamp(),
    };

    const nextHostStatus: Record<string, unknown> = {
      ...(userData.hostStatus ?? {}),
      enabled: false,
      billingTier: tierConfig.tier,
    };
    nextHostStatus.stripeSubscriptionId = admin.firestore.FieldValue.delete();

    tx.update(userRef, {
      onboarding: onboardingUpdate,
      hostStatus: nextHostStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function logBillingEventAdmin(
  clubId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  await db.collection("billingEvents").add({
    clubId,
    eventType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...payload,
  });
}

type HostPlanPhase = "trial" | "active" | "unknown";

function deriveHostPlanPhase(
  metadata?: Stripe.Metadata | null,
  subscriptionStatus?: Stripe.Subscription.Status | string | null
): HostPlanPhase {
  if (subscriptionStatus === "trialing") {
    return "trial";
  }
  if (subscriptionStatus === "active") {
    return "active";
  }
  const phase = metadata?.phase;
  if (phase === "trial" || phase === "active") {
    return phase;
  }
  return "unknown";
}

async function findClubContextBySubscription(subscriptionId: string) {
  const snapshot = await db
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

async function updateStripeSubscriptionTier(
  subscriptionId: string,
  targetTier: HostBillingTier
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items?.data?.[0]?.id;
  if (!itemId) {
    throw new Error(
      `Unable to resolve subscription item for ${subscriptionId}`
    );
  }

  await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: itemId,
        price: hostTierPriceIds[targetTier],
      },
    ],
    proration_behavior: "create_prorations",
  });
}

async function evaluateClubBilling(
  clubId: string,
  data: FirebaseFirestore.DocumentData,
  now: FirebaseFirestore.Timestamp
) {
  const billing = (data.billing || {}) as {
    tier?: HostBillingTier;
    upgradeScheduledFor?: FirebaseFirestore.Timestamp;
    downgradeEligibleAfter?: FirebaseFirestore.Timestamp;
    upgradeReason?: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    usage?: {
      streakOverSoftLimitDays?: number;
      streakBelowThresholdDays?: number;
    };
  };
  const billingTier = (billing.tier as HostBillingTier | undefined) ?? "tier_a";
  const tierConfig = resolveTierConfig(billingTier);
  const membersCount = Number(data.membersCount ?? 0);
  const nextTier = getNextTier(billingTier);
  const prevTier = getPreviousTier(billingTier);

  const overMembersThreshold =
    Boolean(nextTier) && membersCount >= tierConfig.upgradeMembersThreshold;
  const belowMembersThreshold =
    membersCount < tierConfig.downgradeMembersThreshold;

  console.log("[Billing] evaluate:start", {
    clubId,
    billingTier,
    membersCount,
    nextTier,
    prevTier,
    overMembersThreshold,
    belowMembersThreshold,
    streakOver: billing.usage?.streakOverSoftLimitDays ?? 0,
    streakBelow: billing.usage?.streakBelowThresholdDays ?? 0,
    upgradeScheduledFor: billing.upgradeScheduledFor?.toDate?.() ?? null,
    downgradeEligibleAfter: billing.downgradeEligibleAfter?.toDate?.() ?? null,
  });

  const usageUpdates: Record<string, unknown> = {
    "billing.usage.payingMembers": membersCount,
    "billing.usage.loggedAt": now,
    "billing.usage.streakOverSoftLimitDays": overMembersThreshold
      ? (billing.usage?.streakOverSoftLimitDays ?? 0) + 1
      : 0,
    "billing.usage.streakBelowThresholdDays": belowMembersThreshold
      ? (billing.usage?.streakBelowThresholdDays ?? 0) + 1
      : 0,
  };

  await db.doc(`clubs/${clubId}`).set(usageUpdates, { merge: true });

  const usageSnapshot = {
    payingMembers: membersCount,
    videoUploads: data.billing?.usage?.videoUploadsThisMonth ?? 0,
    bandwidthGb: data.billing?.usage?.bandwidthThisMonthGb ?? 0,
    capturedAt: now,
  };
  const dailyKey = now.toDate().toISOString().slice(0, 10);
  const monthDate = now.toDate();
  const monthlyKey = `${monthDate.getFullYear()}-${String(
    monthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  await db
    .doc(`clubUsage/${clubId}/daily/${dailyKey}`)
    .set(usageSnapshot, { merge: true });
  await db
    .doc(`clubUsage/${clubId}/monthly/${monthlyKey}`)
    .set(usageSnapshot, { merge: true });

  if (overMembersThreshold && nextTier) {
    if (!billing.upgradeScheduledFor) {
      console.log("[Billing] evaluate:schedule-upgrade", {
        clubId,
        nextTier,
        membersCount,
        newStreak: (billing.usage?.streakOverSoftLimitDays ?? 0) + 1,
      });
      const scheduledFor = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + HOST_PLAN_WARNING_HOURS * 60 * 60 * 1000
      );
      await db.doc(`clubs/${clubId}`).set(
        {
          "billing.upgradeScheduledFor": scheduledFor,
          "billing.upgradeReason": "members_threshold",
          "billing.warningEmailSentAt": now,
        },
        { merge: true }
      );
      await logBillingEventAdmin(clubId, "host_plan_upgrade_scheduled", {
        targetTier: nextTier,
        reason: "members_threshold",
        scheduledFor: scheduledFor.toDate().toISOString(),
      });
    }
  } else if (!overMembersThreshold && billing.upgradeScheduledFor) {
    console.log("[Billing] evaluate:cancel-upgrade", {
      clubId,
      membersCount,
    });
    await db.doc(`clubs/${clubId}`).set(
      {
        "billing.upgradeScheduledFor": admin.firestore.FieldValue.delete(),
        "billing.upgradeReason": admin.firestore.FieldValue.delete(),
        "billing.warningEmailSentAt": admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );
  }

  if (
    !billing.downgradeEligibleAfter &&
    belowMembersThreshold &&
    (billing.usage?.streakBelowThresholdDays ?? 0) >=
      HOST_PLAN_SOFT_LIMIT_GRACE.downgradeCooldownDays
  ) {
    console.log("[Billing] evaluate:schedule-downgrade", {
      clubId,
      membersCount,
      streakBelow: (billing.usage?.streakBelowThresholdDays ?? 0) + 1,
    });
    await db.doc(`clubs/${clubId}`).set(
      {
        "billing.downgradeEligibleAfter": now,
        "billing.downgradeReason": "members_below_threshold",
      },
      { merge: true }
    );
    await logBillingEventAdmin(clubId, "host_plan_downgrade_scheduled", {
      reason: "members_below_threshold",
    });
  }

  if (
    billing.upgradeScheduledFor &&
    billing.upgradeScheduledFor.toMillis() <= now.toMillis() &&
    nextTier &&
    billing.stripeSubscriptionId &&
    data.hostId
  ) {
    console.log("[Billing] evaluate:execute-upgrade", {
      clubId,
      membersCount,
      targetTier: nextTier,
      scheduledFor: billing.upgradeScheduledFor.toDate?.() ?? null,
      subscriptionId: billing.stripeSubscriptionId,
    });
    await updateStripeSubscriptionTier(billing.stripeSubscriptionId, nextTier);
    await applyHostPlanActivationAdmin({
      uid: data.hostId,
      clubId,
      tier: nextTier,
      stripeCustomerId: billing.stripeCustomerId,
      stripeSubscriptionId: billing.stripeSubscriptionId,
    });
    await db.doc(`clubs/${clubId}`).set(
      {
        "billing.upgradeScheduledFor": admin.firestore.FieldValue.delete(),
        "billing.upgradeReason": admin.firestore.FieldValue.delete(),
        "billing.warningEmailSentAt": admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );
    await logBillingEventAdmin(clubId, "host_plan_upgraded", {
      targetTier: nextTier,
      reason: "members_threshold",
    });
  }

  if (
    billing.downgradeEligibleAfter &&
    billing.downgradeEligibleAfter.toMillis() <= now.toMillis() &&
    prevTier &&
    billing.stripeSubscriptionId &&
    data.hostId
  ) {
    console.log("[Billing] evaluate:execute-downgrade", {
      clubId,
      membersCount,
      targetTier: prevTier,
      downgradeEligibleAfter: billing.downgradeEligibleAfter.toDate?.() ?? null,
      subscriptionId: billing.stripeSubscriptionId,
    });
    await updateStripeSubscriptionTier(billing.stripeSubscriptionId, prevTier);
    await applyHostPlanActivationAdmin({
      uid: data.hostId,
      clubId,
      tier: prevTier,
      stripeCustomerId: billing.stripeCustomerId,
      stripeSubscriptionId: billing.stripeSubscriptionId,
    });
    await db.doc(`clubs/${clubId}`).set(
      {
        "billing.downgradeEligibleAfter": admin.firestore.FieldValue.delete(),
        "billing.downgradeReason": admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );
    await logBillingEventAdmin(clubId, "host_plan_downgraded", {
      targetTier: prevTier,
      reason: "members_below_threshold",
    });
  }
}

/**
 * Creates a Stripe Checkout Session for club subscription
 * Callable function - requires authentication
 */
export const createCheckoutSessionForClub = functions
  .region(region)
  .https.onCall(async (data, context) => {
    const { clubId } = data;

    // Check authentication
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required."
      );
    }

    const uid = context.auth.uid;

    try {
      // Get app configuration
      const appUrl = functions.config().app.url;
      console.log("[createCheckoutSessionForClub] start", {
        uid,
        clubId,
        appUrl,
      });

      // Fetch club data
      const clubSnap = await db.doc(`clubs/${clubId}`).get();
      if (!clubSnap.exists) {
        console.error("[createCheckoutSessionForClub] club not found", clubId);
        throw new functions.https.HttpsError("not-found", "Club not found.");
      }

      const club = clubSnap.data()!;

      const price = Number(club.info?.price ?? 0);
      const currency = String(
        club.info?.currency ?? (functions.config().app.currency || "AUD")
      );
      const slug = String(club.info?.slug ?? "imaginehumans");
      const clubName = String(club.info?.name || "Club Membership");
      const clubVision = club.info?.vision || "";

      const defaultTrialDays = 7;

      if (!Number.isFinite(price) || price <= 0) {
        console.error("[Billing] Checkout creation failed", {
          clubId,
          uid,
          reason: "invalid_price",
        });
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Club price must be configured before starting checkout."
        );
      }

      const trialConfig = await resolveTrialConfig({
        uid,
        clubId,
        pricingLocked: club.pricingLocked,
        defaultTrialDays,
      });

      // Check for any prior membership-related payments for this user+club
      const priorPaymentsSnap = await db
        .collection("payments")
        .where("uid", "==", uid)
        .where("clubId", "==", clubId)
        .where("type", "in", [
          "trial_start",
          "subscription",
          "subscription_first_charge",
          "subscription_renewal",
        ])
        .limit(1)
        .get();

      const hasUsedTrialOrPaidBefore = !priorPaymentsSnap.empty;
      const shouldHaveTrial = !hasUsedTrialOrPaidBefore;

      console.log("[createCheckoutSessionForClub] prior payments check", {
        uid,
        clubId,
        priorPaymentsCount: priorPaymentsSnap.size,
        hasUsedTrialOrPaidBefore,
        shouldHaveTrial,
      });

      const clubTrialDays = defaultTrialDays;
      let trialDays = trialConfig.trialDays;
      let noTrial = trialConfig.noTrial;

      if (
        !noTrial &&
        !shouldHaveTrial &&
        club.pricingLocked !== false &&
        typeof trialDays === "number" &&
        trialDays > 0
      ) {
        trialDays = 0;
        noTrial = true;
      }

      console.log("[createCheckoutSessionForClub] trial calculation", {
        uid,
        clubId,
        clubTrialDays,
        trialDays,
        noTrial,
        willApplyTrialPeriodDays:
          typeof trialDays === "number" && trialDays > 0,
        overrideReason: trialConfig.overrideReason || null,
      });

      // Build product_data conditionally (Stripe doesn't accept empty strings)
      const productData: {
        name: string;
        description?: string;
      } = {
        name: clubName,
      };

      if (clubVision && clubVision.trim()) {
        productData.description = clubVision;
      }

      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
        {
          metadata: {
            uid,
            clubId,
            type: "sub",
            noTrial: String(noTrial),
          },
        };

      if (typeof trialDays === "number" && trialDays > 0) {
        subscriptionData.trial_period_days = trialDays;
      }

      console.log("[createCheckoutSessionForClub] subscription_data", {
        uid,
        clubId,
        subscriptionData,
      });

      const checkoutPayload: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        subscription_data: subscriptionData,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: productData,
              unit_amount: Math.round(price * 100), // Convert to cents
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        metadata: {
          uid,
          clubId,
          type: "sub",
          noTrial: String(noTrial),
        },
        success_url: `${appUrl}/club/${slug}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/club/${slug}/overview`,
      };

      // Create Stripe checkout session for subscription
      const session = await stripe.checkout.sessions.create(checkoutPayload);

      console.log("[createCheckoutSessionForClub] session created", {
        uid,
      });

      return { id: session.id };
    } catch (error) {
      console.error("[Billing] Checkout creation failed", {
        clubId,
        uid,
        error,
      });
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create checkout session"
      );
    }
  });

/**
 * Creates a Stripe Checkout Session for $1 host onboarding fee
 * Callable function - requires authentication
 */
export const createCheckoutSessionForHostOneDollar = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required."
      );
    }

    const uid = context.auth.uid;

    try {
      // Get app configuration
      const appUrl = functions.config().app.url;
      const currency = functions.config().app.currency || "AUD";

      // Create Stripe checkout session for one-time $1 payment
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: "ImagineHumans – Host Onboarding Fee",
                description: "One-time fee to become a club host",
              },
              unit_amount: 100, // $1 in cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          uid,
          type: "host_fee",
        },
        success_url: `${appUrl}/become-host?status=success`,
        cancel_url: `${appUrl}/become-host?status=cancel`,
      });

      return { id: session.id };
    } catch (error) {
      console.error("Error creating checkout session for host fee:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create checkout session"
      );
    }
  });

/**
 * Stripe Webhook handler
 * Processes webhook events from Stripe and updates Firestore
 */
export const stripeWebhook = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = functions.config().stripe.webhook_secret;

    if (!sig) {
      console.error("Missing stripe-signature header");
      res.status(400).send("Missing stripe-signature header");
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", errorMessage);
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    try {
      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata || {};
          const uid = String(meta.uid || "");
          const type = String(meta.type || "");
          const clubId = String(meta.clubId || "");

          if (meta.noTrial === "true") {
            console.log("[Billing] Returning free member – ", {
              uid,
              clubId,
              sessionId: session.id,
            });
          }

          // Idempotency check: if we've already recorded a payment for this session, skip processing.
          const alreadyProcessed = await hasProcessedCheckoutSession(
            session.id
          );
          if (alreadyProcessed) {
            console.log(
              "Skipping already-processed checkout session",
              session.id
            );
            break;
          }

          // Extract common Stripe fields
          const paymentIntentId = session.payment_intent?.toString() || "";
          const customerId = session.customer?.toString() || "";
          const subscriptionId = session.subscription?.toString() || "";
          const amountTotal = Number(session.amount_total || 0);
          const currency = session.currency || "aud";

          if (!uid) {
            console.warn("Missing uid in metadata for session:", session.id);
          }

          // Handle download checkout (one-time purchase)
          if (type === "download") {
            const downloadId = String(meta.downloadId || "");
            if (!clubId || !downloadId || !uid) {
              console.warn(
                "Missing metadata for download purchase",
                session.id,
                clubId,
                downloadId,
                uid
              );
              break;
            }

            await db
              .doc(`clubs/${clubId}/downloads/${downloadId}/purchases/${uid}`)
              .set(
                {
                  status: "succeeded",
                  amount: amountTotal,
                  currency: currency.toUpperCase(),
                  stripe: {
                    sessionId: session.id,
                    paymentIntentId,
                    status: "succeeded",
                  },
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

            const clubRef = db.doc(`clubs/${clubId}`);
            const clubSnap = await clubRef.get();
            const clubData = clubSnap.data() || {};
            const billing = (clubData.billing || {}) as ClubBillingConfig;

            const { platformFeePercent, platformFeeAmount, hostAmount } =
              computePlatformHostSplit(amountTotal, billing);

            await db.collection("payments").add({
              uid,
              clubId,
              downloadId,
              type: "download",
              amount: amountTotal,
              currency: currency.toUpperCase(),
              platformFeePercent,
              platformFeeAmount,
              hostAmount,
              stripe: {
                sessionId: session.id,
                paymentIntentId,
                status: "succeeded",
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(
              `Recorded download purchase for user ${uid} download ${downloadId}`
            );
            break;
          }

          // Handle host plan checkout
          if (type === "host_plan" && clubId && uid) {
            const phase = deriveHostPlanPhase(meta);
            const tier = (meta.tier as HostBillingTier | undefined) ?? "tier_a";
            const amountTotal = typeof session.amount_total === "number"
              ? session.amount_total
              : 0;
            const currency = (session.currency || "aud").toUpperCase();
            const eventType =
              phase === "trial"
                ? "host_plan_trial_started"
                : "host_plan_activated";

            await applyHostPlanActivationAdmin({
              uid,
              clubId,
              tier,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            });
            await logBillingEventAdmin(clubId, eventType, {
              uid,
              phase,
              tier,
              amountCents: amountTotal,
              currency,
              sessionId: session.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            });
            break;
          }

          // Handle subscription checkout (Join Club)
          if (type === "sub" && clubId) {
            console.log(
              `Processing subscription for user ${uid} to club ${clubId}`
            );

            // Ensure user document exists and add club to user's clubsJoined array
            const userRef = db.doc(`users/${uid}`);
            const clubRef = db.doc(`clubs/${clubId}`);
            const userSnap = await userRef.get();
            const userData = userSnap.data() || {};
            const existingMembership = (userData.clubMemberships || {})[
              clubId
            ] as ClubMembershipDoc | undefined;
            const existingClubsJoined = Array.isArray(userData.clubsJoined)
              ? userData.clubsJoined.map((c: unknown) => String(c))
              : [];
            const wasMemberBefore = existingClubsJoined.includes(clubId);

            if (!userSnap.exists) {
              console.warn(`User document ${uid} doesn't exist, creating it`);
              await userRef.set({
                uid,
                clubsJoined: [clubId],
                clubsHosted: [],
                roles: { user: true, host: false },
                hostStatus: { enabled: false },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              // Update existing user document
              await userRef.set(
                {
                  clubsJoined: admin.firestore.FieldValue.arrayUnion(clubId),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }

            console.log(
              `Added club ${clubId} to user ${uid}'s clubsJoined array`
            );

            if (!wasMemberBefore) {
              // Increment club's member count
              await clubRef.set(
                {
                  membersCount: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }

            const clubSnap = await clubRef.get();
            const clubData = clubSnap.data() || {};
            const billing = (clubData.billing || {}) as ClubBillingConfig;

            const { platformFeePercent, platformFeeAmount, hostAmount } =
              computePlatformHostSplit(amountTotal, billing);

            let subscription: Stripe.Subscription | null = null;
            if (subscriptionId) {
              try {
                subscription =
                  await stripe.subscriptions.retrieve(subscriptionId);
              } catch (error) {
                console.error(
                  "Failed to retrieve subscription for checkout session",
                  subscriptionId,
                  error
                );
              }
            }

            const trialEndUnix = subscription?.trial_end ?? null;
            const trialEndsAt = trialEndUnix
              ? admin.firestore.Timestamp.fromMillis(trialEndUnix * 1000)
              : null;
            const subscriptionIsTrialing = subscription?.status === "trialing";

            const membershipStatus = subscriptionIsTrialing
              ? "trialing"
              : "active";
            const membershipLastPaymentType = subscriptionIsTrialing
              ? "trial_start"
              : "subscription";
            const membershipUpdate = {
              status: membershipStatus,
              isTrialing: subscriptionIsTrialing,
              stripeSubscriptionId: subscriptionId || "",
              trialEndsAt: subscriptionIsTrialing ? trialEndsAt : null,
              lastPaymentType: membershipLastPaymentType,
              lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
              consecutiveFailedPayments: 0,
            };

            await userRef.set(
              {
                clubMemberships: {
                  [clubId]: membershipUpdate,
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            if (amountTotal > 0) {
              // Create immediate subscription payment record
              await db.collection("payments").add({
                uid,
                clubId,
                type: "subscription",
                amount: amountTotal,
                currency: currency.toUpperCase(),
                platformFeePercent,
                platformFeeAmount,
                hostAmount,
                stripe: {
                  sessionId: session.id,
                  customerId,
                  subscriptionId,
                  paymentIntentId,
                  status: "succeeded",
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              await db.collection("payments").add({
                uid,
                clubId,
                type: "trial_start",
                amount: 0,
                currency: currency.toUpperCase(),
                stripe: {
                  sessionId: session.id,
                  customerId,
                  subscriptionId,
                  paymentIntentId,
                  status: "trialing",
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            console.log(
              `Successfully added user ${uid} to club ${clubId} and created payment record`
            );

            await logMembershipAudit({
              clubId,
              userId: uid,
              oldStatus: existingMembership?.status ?? null,
              newStatus: membershipStatus,
              changedBy: "system",
              reason: "free_to_paid",
              reason_detail: subscriptionIsTrialing
                ? "checkout.session.completed: trial_started"
                : "checkout.session.completed: activated",
            });

            const analyticsType = subscriptionIsTrialing
              ? "trial_started"
              : "subscription_created";

            // At checkout we only know that a "new subscriber flow" has started.
            // We DO NOT touch activeSubscribers or totalRevenue here to avoid double counting.
            // Those are updated strictly on invoice.payment_succeeded.
            const analyticsIncrements = subscriptionIsTrialing
              ? {
                  newSubscribers: 1,
                  trialStarts: 1,
                }
              : {
                  newSubscribers: 1,
                };

            await recordBillingAnalyticsEvent({
              clubId,
              userId: uid,
              amount: amountTotal ?? 0,
              currency: currency.toUpperCase(),
              type: analyticsType,
              increments: analyticsIncrements,
              stripeId: subscriptionId || session.id,
            });
          }

          // Handle host fee checkout
          // Check if we need this anymore
          if (type === "host_fee") {
            console.log(`Processing host fee payment for user ${uid}`);

            // Mark user as eligible to host by setting roles.host = true
            await db.doc(`users/${uid}`).set(
              {
                roles: {
                  user: true,
                  host: true,
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            // Create payment record
            await db.collection("payments").add({
              uid,
              clubId: "",
              type: "one_time",
              amount: amountTotal,
              currency: currency.toUpperCase(),
              stripe: {
                sessionId: session.id,
                customerId,
                paymentIntentId,
                status: "succeeded",
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(
              `Successfully granted host role to user ${uid} and created payment record`
            );
          }
          break;
        }

        // Notify the analytics service of the event
        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          const metadata = subscription.metadata || {};
          if (metadata.type !== "sub") {
            break;
          }

          const uid = String(metadata.uid || "");
          const clubId = String(metadata.clubId || "");

          if (!uid || !clubId) {
            console.warn(
              "[Billing] Missing identifiers on subscription.created",
              subscription.id
            );
            break;
          }

          const clubSnap = await db.doc(`clubs/${clubId}`).get();
          const clubData = clubSnap.data() || {};
          const currency = String(
            clubData.info?.currency || "AUD"
          ).toUpperCase();

          const createdMillis =
            typeof subscription.created === "number"
              ? subscription.created * 1000
              : Date.now();

          await recordBillingAnalyticsEvent({
            clubId,
            userId: uid,
            amount: 0,
            currency,
            type: "subscription_created",
            increments: {},
            timestamp: admin.firestore.Timestamp.fromMillis(createdMillis),
            stripeId: subscription.id,
          });
          break;
        }

        // we only process host_plan in this update event.
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const metadata = subscription.metadata || {};
          if (metadata.type && metadata.type !== "host_plan") {
            break;
          }

          const subscriptionId = subscription.id;
          const subscriptionStatus = subscription.status;
          const subscriptionPhase = deriveHostPlanPhase(
            metadata,
            subscriptionStatus
          );
          let phase = subscriptionPhase;

          const desiredPhase =
            subscriptionStatus === "active"
              ? "active"
              : subscriptionStatus === "trialing"
              ? "trial"
              : null;

          if (desiredPhase && metadata.phase !== desiredPhase) {
            try {
              const nextMetadata = { ...metadata, phase: desiredPhase };
              await stripe.subscriptions.update(subscriptionId, {
                metadata: nextMetadata,
              });
              phase = desiredPhase;
            } catch (err) {
              console.error("Failed to sync host plan phase metadata", {
                subscriptionId,
                desiredPhase,
                error: err,
              });
            }
          }

          const lookup =
            (metadata.clubId && metadata.uid
              ? {
                  clubId: String(metadata.clubId),
                  uid: String(metadata.uid),
                }
              : await findClubContextBySubscription(subscriptionId)) || null;

          if (!lookup?.clubId || !lookup?.uid) {
            console.warn(
              "Unable to resolve host subscription context",
              subscriptionId
            );
            break;
          }

          const tier =
            (metadata.tier as HostBillingTier | undefined) ||
            getTierForPriceId(subscription.items?.data?.[0]?.price?.id || "") ||
            "tier_a";

          await applyHostPlanActivationAdmin({
            uid: lookup.uid,
            clubId: lookup.clubId,
            tier,
            stripeCustomerId: subscription.customer?.toString(),
            stripeSubscriptionId: subscriptionId,
          });

          await logBillingEventAdmin(
            lookup.clubId,
            "host_plan_subscription_updated",
            {
              uid: lookup.uid,
              tier,
              phase,
              priceId:
                subscription.items?.data?.[0]?.price?.id ||
                metadata.priceId ||
                null,
              amountCents:
                subscription.items?.data?.[0]?.price?.unit_amount ?? null,
              currency:
                subscription.items?.data?.[0]?.price?.currency?.toUpperCase() ||
                metadata.priceCurrency ||
                null,
              trialEndsAt:
                typeof subscription.trial_end === "number"
                  ? new Date(subscription.trial_end * 1000).toISOString()
                  : null,
              sessionId: null,
              stripeCustomerId: subscription.customer?.toString() || null,
              stripeSubscriptionId: subscriptionId,
              status: subscriptionStatus,
            }
          );
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const metadata = subscription.metadata || {};
          const subscriptionId = subscription.id;

          if (metadata.type === "sub") {
            const uid = String(metadata.uid || "");
            const clubId = String(metadata.clubId || "");

            if (!uid || !clubId) {
              console.warn(
                "Missing uid or clubId on cancelled member subscription",
                subscriptionId
              );
              break;
            }

            // 🔴 NEW: always clean up failure tracking for member subs
            await db
              .doc(`subscriptionFailures/${subscriptionId}`)
              .delete()
              .catch((err) => {
                console.error(
                  "Failed to delete subscriptionFailures doc on cancellation",
                  subscriptionId,
                  err
                );
              });

            const userRef = db.doc(`users/${uid}`);
            const userSnap = await userRef.get();
            const userData = userSnap.data() || {};
            const clubsJoined = Array.isArray(userData.clubsJoined)
              ? userData.clubsJoined.map((id: unknown) => String(id))
              : [];
            const isMember = clubsJoined.includes(clubId);

            if (!isMember) {
              console.log("Skipping cancellation; user already removed", {
                uid,
                clubId,
                subscriptionId,
              });
              break;
            }

            const existingMembership =
              (userData.clubMemberships || {})[clubId] || {};
            const wasActive =
              existingMembership.status === "active" &&
              existingMembership.isTrialing === false;
            const activeDelta = wasActive ? 1 : 0;

            await userRef.set(
              {
                clubsJoined: admin.firestore.FieldValue.arrayRemove(clubId),
                clubMemberships: {
                  [clubId]: {
                    status: "canceled",
                    isTrialing: false,
                    stripeSubscriptionId: subscriptionId || "",
                    trialEndsAt: null,
                    lastPaymentType:
                      existingMembership.lastPaymentType || "invoice_failed",
                    lastPaymentAt:
                      existingMembership.lastPaymentAt ||
                      admin.firestore.FieldValue.serverTimestamp(),
                    consecutiveFailedPayments:
                      typeof existingMembership.consecutiveFailedPayments ===
                      "number"
                        ? existingMembership.consecutiveFailedPayments
                        : 0,
                  },
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            const clubRef = db.doc(`clubs/${clubId}`);
            const clubSnapForAnalytics = await clubRef.get();
            const clubCurrency = String(
              clubSnapForAnalytics.data()?.info?.currency || "AUD"
            ).toUpperCase();
            await clubRef.set(
              {
                membersCount: admin.firestore.FieldValue.increment(-1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            console.log("Processed member subscription cancellation", {
              uid,
              clubId,
              subscriptionId,
            });

            if (activeDelta > 0) {
              await recordBillingAnalyticsEvent({
                clubId,
                userId: uid,
                amount: 0,
                currency: clubCurrency,
                type: "subscription_canceled",
                increments: {
                  activeSubscribers: activeDelta,
                },
                mode: "subtract",
                stripeId: subscriptionId,
              });
            }

            await recordBillingAnalyticsEvent({
              clubId,
              userId: uid,
              amount: 0,
              currency: clubCurrency,
              type: "subscription_canceled",
              increments: {
                cancellations: 1,
              },
              mode: "add",
              stripeId: subscriptionId,
            });

            await logMembershipAudit({
              clubId,
              userId: uid,
              oldStatus: existingMembership?.status ?? null,
              newStatus: "canceled",
              changedBy: "system",
              reason: "subscription_canceled",
              reason_detail: `customer.subscription.deleted:${subscriptionId}`,
            });
            break;
          }

          if (metadata.type && metadata.type !== "host_plan") {
            break;
          }

          const phase = deriveHostPlanPhase(metadata, subscription.status);
          const lookup =
            (metadata.clubId && metadata.uid
              ? {
                  clubId: String(metadata.clubId),
                  uid: String(metadata.uid),
                }
              : await findClubContextBySubscription(subscriptionId)) || null;

          if (!lookup?.clubId || !lookup?.uid) {
            console.warn(
              "Unable to resolve cancellation context",
              subscriptionId
            );
            break;
          }

          await applyHostPlanCancellationAdmin({
            uid: lookup.uid,
            clubId: lookup.clubId,
            downgradeReason: "subscription_cancelled",
          });

          await logBillingEventAdmin(
            lookup.clubId,
            "host_plan_subscription_cancelled",
            {
              uid: lookup.uid,
              phase,
              stripeSubscriptionId: subscriptionId,
            }
          );
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log("invoice.payment_succeeded received", {
            invoiceId: invoice.id,
            billingReason: invoice.billing_reason,
          });

          const validBillingReasons = new Set([
            "subscription_cycle",
            "subscription_create",
          ]);
          if (
            !invoice.billing_reason ||
            !validBillingReasons.has(invoice.billing_reason)
          ) {
            console.log("Skipping unsupported invoice reason", {
              invoiceId: invoice.id,
              billingReason: invoice.billing_reason,
            });
            break;
          }
          const lineWithSubscription =
            invoice.lines?.data?.find((line) => line.subscription) || null;
          const fallbackLineSubscription =
            lineWithSubscription?.subscription || null;

          const invoiceBase = invoice as Stripe.Invoice & {
            parent?: {
              subscription_details?: SubscriptionDetailsPayload;
            } | null;
            subscription_details?: SubscriptionDetailsPayload;
          };

          const invoiceSubscriptionDetails: SubscriptionDetailsPayload =
            invoiceBase.subscription_details ||
            invoiceBase.parent?.subscription_details ||
            null;

          const subscriptionRef = (invoice.subscription ??
            invoiceSubscriptionDetails?.subscription ??
            fallbackLineSubscription ??
            null) as string | Stripe.Subscription | null;

          if (!subscriptionRef) {
            console.warn("Invoice missing subscription reference", invoice.id);
            break;
          }

          let subscription: Stripe.Subscription | null = null;
          let subscriptionId: string | null = null;

          if (typeof subscriptionRef === "string") {
            subscriptionId = subscriptionRef;
            try {
              subscription =
                await stripe.subscriptions.retrieve(subscriptionRef);
            } catch (error) {
              console.error(
                "Failed to retrieve subscription for invoice",
                invoice.id,
                error
              );
              break;
            }
          } else {
            subscription = subscriptionRef;
            subscriptionId = subscriptionRef.id;
          }

          const metadata =
            subscription?.metadata ||
            invoiceSubscriptionDetails?.metadata ||
            lineWithSubscription?.metadata ||
            {};
          const metadataType = metadata.type;
          const metadataUid = metadata.uid;
          const metadataClubId = metadata.clubId;

          if (metadataType !== "sub" || !metadataUid || !metadataClubId) {
            console.warn("Subscription metadata missing identifiers", {
              invoiceId: invoice.id,
              subscriptionId,
            });
            break;
          }

          const uid = String(metadataUid);
          const clubId = String(metadataClubId);
          const existing = await db
            .collection("payments")
            .where("stripe.invoiceId", "==", invoice.id)
            .limit(1)
            .get();

          if (!existing.empty) {
            console.log("Skipping already-processed invoice", invoice.id);
            break;
          }

          const clubSnap = await db.doc(`clubs/${clubId}`).get();
          const clubData = clubSnap.data() || {};
          const billing = (clubData.billing || {}) as ClubBillingConfig;
          const gross = invoice.amount_paid ?? 0; // amount_paid is always in minor units (e.g., cents)
          const isPaidInvoice = gross > 0;

          const priorPaidSnap = await db
            .collection("payments")
            .where("stripe.subscriptionId", "==", subscriptionId || "")
            .where("type", "in", [
              "subscription_first_charge",
              "subscription_renewal",
            ])
            .limit(1)
            .get();
          const isFirstPaidInvoice = isPaidInvoice && priorPaidSnap.empty;
          const stillTrialing =
            subscription?.status === "trialing" &&
            typeof subscription.trial_end === "number" &&
            subscription.trial_end * 1000 > Date.now();
          const isTrialConversion =
            isFirstPaidInvoice &&
            Boolean(subscription?.trial_end) &&
            !stillTrialing;

          if (!isPaidInvoice) {
            console.log("[Billing] Skipping zero-amount invoice analytics", {
              invoiceId: invoice.id,
              subscriptionId,
            });
            break;
          }

          const paymentType = isFirstPaidInvoice
            ? "subscription_first_charge"
            : "subscription_renewal";
          const invoiceCreatedMillis =
            typeof invoice.created === "number"
              ? invoice.created * 1000
              : Date.now();
          const { platformFeePercent, platformFeeAmount, hostAmount } =
            computePlatformHostSplit(gross, billing);

          await db.collection("payments").add({
            uid,
            clubId,
            type: paymentType,
            amount: gross,
            currency: (invoice.currency || "aud").toUpperCase(),
            platformFeePercent,
            platformFeeAmount,
            hostAmount,
            stripe: {
              invoiceId: invoice.id,
              subscriptionId: subscriptionId || "",
              customerId: invoice.customer?.toString() || "",
              status: "succeeded",
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Recorded subscription renewal payment", {
            invoiceId: invoice.id,
            subscriptionId,
            uid,
            clubId,
          });

          const userRef = db.doc(`users/${uid}`);
          const previousUserSnap = await userRef.get();
          const previousStatus =
            previousUserSnap.data()?.clubMemberships?.[clubId]?.status ?? null;

          if (stillTrialing) {
            console.log(
              "[Billing] Skipping membership update – subscription still trialing",
              {
                uid,
                clubId,
                subscriptionId,
                trial_end: subscription?.trial_end,
              }
            );
          } else {
            await userRef.set(
              {
                clubMemberships: {
                  [clubId]: {
                    status: "active",
                    isTrialing: false,
                    stripeSubscriptionId: subscriptionId || "",
                    trialEndsAt: null,
                    lastPaymentType: paymentType,
                    lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
                    consecutiveFailedPayments: 0,
                  },
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }

          if (subscriptionId) {
            const failureRef = db.doc(`subscriptionFailures/${subscriptionId}`);
            const failureSnap = await failureRef.get();
            if (failureSnap.exists) {
              await failureRef.delete().catch((err) => {
                console.error(
                  "Failed to delete subscriptionFailures doc after success",
                  subscriptionId,
                  err
                );
              });
            }
          }

          const invoiceCurrency = (invoice.currency || "aud").toUpperCase();
          const analyticsType = isTrialConversion
            ? "trial_converted"
            : "invoice_paid";
          const analyticsIncrements = isTrialConversion
            ? {
                activeSubscribers: 1,
                trialConversions: 1,
                totalRevenue: gross,
              }
            : isFirstPaidInvoice
              ? {
                  activeSubscribers: 1,
                  totalRevenue: gross,
                }
              : {
                  totalRevenue: gross,
                };

          await recordBillingAnalyticsEvent({
            clubId,
            userId: uid,
            amount: gross,
            currency: invoiceCurrency,
            type: analyticsType,
            increments: analyticsIncrements,
            timestamp:
              admin.firestore.Timestamp.fromMillis(invoiceCreatedMillis),
            isTrialConversion,
            stripeId: invoice.id,
          });

          if (isFirstPaidInvoice) {
            await logMembershipAudit({
              clubId,
              userId: uid,
              oldStatus: previousStatus,
              newStatus: "active",
              changedBy: "system",
              reason: isTrialConversion ? "trial_end" : "free_to_paid",
              reason_detail: `invoice.payment_succeeded:${invoice.id}`,
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log("Payment failed for invoice:", invoice.id);
          if (invoice.billing_reason !== "subscription_cycle") {
            console.log(
              "Skipping non-subscription-cycle failed invoice",
              invoice.id
            );
            break;
          }

          const lineWithSubscription =
            invoice.lines?.data?.find((line) => line.subscription) || null;
          const fallbackLineSubscription =
            lineWithSubscription?.subscription || null;
          const invoiceBase = invoice as Stripe.Invoice & {
            parent?: {
              subscription_details?: SubscriptionDetailsPayload;
            } | null;
            subscription_details?: SubscriptionDetailsPayload;
          };
          const invoiceSubscriptionDetails: SubscriptionDetailsPayload =
            invoiceBase.subscription_details ||
            invoiceBase.parent?.subscription_details ||
            null;
          const subscriptionRef = (invoice.subscription ??
            invoiceSubscriptionDetails?.subscription ??
            fallbackLineSubscription ??
            null) as string | Stripe.Subscription | null;

          if (!subscriptionRef) {
            console.warn(
              "Failed invoice missing subscription reference",
              invoice.id
            );
            break;
          }

          let subscription: Stripe.Subscription | null = null;
          let subscriptionId: string | null = null;
          if (typeof subscriptionRef === "string") {
            subscriptionId = subscriptionRef;
            try {
              subscription =
                await stripe.subscriptions.retrieve(subscriptionRef);
            } catch (error) {
              console.error(
                "Failed to retrieve subscription for failed invoice",
                invoice.id,
                error
              );
            }
          } else {
            subscription = subscriptionRef;
            subscriptionId = subscriptionRef.id;
          }

          const metadata =
            subscription?.metadata ||
            invoiceSubscriptionDetails?.metadata ||
            lineWithSubscription?.metadata ||
            {};
          const metadataType = metadata.type;
          const metadataUid = metadata.uid;
          const metadataClubId = metadata.clubId;

          if (metadataType !== "sub" || !metadataUid || !metadataClubId) {
            console.warn("Failed invoice metadata missing identifiers", {
              invoiceId: invoice.id,
              subscriptionId,
            });
            break;
          }

          if (!subscriptionId) {
            console.warn(
              "Failed invoice missing subscriptionId after resolution",
              invoice.id
            );
            break;
          }

          const uid = String(metadataUid);
          const clubId = String(metadataClubId);
          const failDocRef = db.doc(`subscriptionFailures/${subscriptionId}`);
          const failDocSnap = await failDocRef.get();
          const prevFailure =
            (failDocSnap.exists
              ? (failDocSnap.data() as {
                  failureCount?: number;
                  lastInvoiceId?: string;
                })
              : null) ?? null;

          if (prevFailure?.lastInvoiceId === invoice.id) {
            console.log("Skipping duplicate failed invoice", invoice.id);
            break;
          }

          const newFailureCount = (prevFailure?.failureCount ?? 0) + 1;
          await failDocRef.set(
            {
              subscriptionId,
              uid,
              clubId,
              failureCount: newFailureCount,
              lastInvoiceId: invoice.id,
              lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const userRef = db.doc(`users/${uid}`);
          const previousUserSnap = await userRef.get();
          const previousStatus =
            previousUserSnap.data()?.clubMemberships?.[clubId]?.status ?? null;

          await userRef.set(
            {
              clubMemberships: {
                [clubId]: {
                  status: "active",
                  isTrialing: false,
                  stripeSubscriptionId: subscriptionId || "",
                  trialEndsAt: null,
                  lastPaymentType: "invoice_failed",
                  lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
                  consecutiveFailedPayments: newFailureCount,
                },
              },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          if (newFailureCount >= 3) {
            try {
              await stripe.subscriptions.cancel(subscriptionId);
              await db.collection("billingEvents").add({
                type: "member_subscription_auto_cancelled_after_failures",
                uid,
                clubId,
                subscriptionId,
                failureCount: newFailureCount,
                invoiceId: invoice.id,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } catch (error) {
              console.error(
                "Failed to auto-cancel subscription after repeated failures",
                subscriptionId,
                error
              );
            }
          }

          const invoiceWithLegacyErrors = invoice as Stripe.Invoice & {
            last_payment_error?: { message?: string | null } | null;
            failure_message?: string | null;
          };
          const paymentFailureDetail =
            invoiceWithLegacyErrors.last_payment_error?.message ||
            invoiceWithLegacyErrors.failure_message ||
            `invoice.payment_failed:${invoice.id}`;

          await logMembershipAudit({
            clubId,
            userId: uid,
            oldStatus: previousStatus,
            newStatus: "active",
            changedBy: "system",
            reason: "payment_failed",
            reason_detail: paymentFailureDetail,
          });
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      res.status(500).send("Webhook handler failed");
    }
  });

export const testAnalyticsWrite = functions
  .region(region)
  .https.onCall(async (data, context) => {
    if (process.env.FUNCTIONS_EMULATOR !== "true") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "testAnalyticsWrite is only available in the emulator."
      );
    }

    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required for sanity checks."
      );
    }

    const clubId = String(data?.clubId || "").trim();
    const amount = Number(data?.amount ?? 0);
    const currency = String(data?.currency ?? "AUD").toUpperCase();

    if (!clubId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "clubId is required"
      );
    }

    if (!Number.isFinite(amount) || amount < 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "amount must be a non-negative number"
      );
    }

    const clubRef = db.collection("clubs").doc(clubId);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Club not found.");
    }

    const clubData = clubSnap.data() || {};
    if (clubData.hostId !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the club host can run billing sanity checks."
      );
    }

    const timestamp = admin.firestore.Timestamp.now();
    const { docRef, monthKey } = getBillingAnalyticsRefs(clubId, timestamp);

    try {
      await updateBillingAnalytics(
        docRef,
        {
          currency,
          totalRevenue: amount,
        },
        "add"
      );
      console.log("[Billing] Sanity check passed", {
        clubId,
        monthKey,
        amount,
        uid,
      });
      return { ok: true, month: monthKey };
    } catch (error) {
      console.error("[Billing] Sanity check failed", {
        clubId,
        uid,
        error,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Analytics sanity write failed"
      );
    }
  });

export const reconcileHostPlans = functions
  .region(region)
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collection("clubs").get();
    for (const docSnap of snapshot.docs) {
      try {
        await evaluateClubBilling(docSnap.id, docSnap.data(), now);
      } catch (error) {
        console.error(`[Billing] Failed to evaluate ${docSnap.id}`, error);
      }
    }
  });
