import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { createOrReusePlaygroundClub } from "@/lib/db/onboarding";
import {
  HOST_PLAN_DEFAULT_TIER,
  HOST_BILLING_TIERS,
  HOST_PLAN_TRIAL_DAYS,
} from "@/lib/constants";
import {
  getServerStripeClient,
  getStripePriceIdForTier,
} from "@/lib/server-stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SUCCESS_PATH = "/onboarding/host/welcome";
const CANCEL_PATH = "/onboarding/host/select-plan?resume=true";

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const { clubId, slug } = await createOrReusePlaygroundClub(decoded.uid);
    const tier = HOST_PLAN_DEFAULT_TIER;

    const stripe = getServerStripeClient();
    const priceId = getStripePriceIdForTier(tier);
    const planPriceAud = HOST_BILLING_TIERS[tier].monthlyPriceAud;
    const hasTrial = HOST_PLAN_TRIAL_DAYS > 0;
    const trialDays = HOST_PLAN_TRIAL_DAYS || 0;
    const phase = hasTrial ? "trial" : "active";
    const commonMetadata = {
      uid: decoded.uid,
      clubId,
      type: "host_plan",
      tier,
      priceId,
      priceAud: String(planPriceAud),
      priceCurrency: "AUD",
      hasTrial: String(hasTrial),
      trialDays: String(trialDays),
      phase,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: clubId,
      metadata: commonMetadata,
      subscription_data: {
        trial_period_days: HOST_PLAN_TRIAL_DAYS,
        metadata: commonMetadata,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      cancel_url: `${APP_URL}${CANCEL_PATH}`,
      success_url: `${APP_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: decoded.email ?? undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      clubId,
      slug,
    });
  } catch (error) {
    console.error("[Onboarding host select plan] failed", error);
    return NextResponse.json(
      { error: "Unable to start plan checkout" },
      { status: 500 }
    );
  }
}
