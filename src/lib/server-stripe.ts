import Stripe from "stripe";
import type { HostBillingTier } from "@/types/club";
import { HOST_STRIPE_PRICE_IDS, serverEnv } from "./env-server";

let stripeClient: Stripe | null = null;

export function getServerStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

export function getStripePriceIdForTier(tier: HostBillingTier): string {
  return HOST_STRIPE_PRICE_IDS[tier];
}

export function getTierForPriceId(
  priceId?: string | null
): HostBillingTier | null {
  if (!priceId) {
    return null;
  }
  const match = (
    Object.entries(HOST_STRIPE_PRICE_IDS) as [HostBillingTier, string][]
  ).find(([, value]) => value === priceId);
  return match ? match[0] : null;
}
