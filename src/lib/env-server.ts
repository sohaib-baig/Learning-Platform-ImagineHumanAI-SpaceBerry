import "server-only";

import { z } from "zod";
import type { HostBillingTier } from "@/types/club";

/**
 * Server-only environment variables schema validation
 */
const serverEnvSchema = z.object({
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_TIER_A: z.string().min(1),
  STRIPE_PRICE_ID_TIER_B: z.string().min(1),
  STRIPE_PRICE_ID_TIER_C: z.string().min(1),
  AMPLITUDE_SERVER_API_KEY: z.string().optional(),
});

function getServerEnvVariables() {
  try {
    return serverEnvSchema.parse({
      POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRICE_ID_TIER_A: process.env.STRIPE_PRICE_ID_TIER_A,
      STRIPE_PRICE_ID_TIER_B: process.env.STRIPE_PRICE_ID_TIER_B,
      STRIPE_PRICE_ID_TIER_C: process.env.STRIPE_PRICE_ID_TIER_C,
      AMPLITUDE_SERVER_API_KEY: process.env.AMPLITUDE_SERVER_API_KEY,
    });
  } catch (error) {
    console.error("❌ Invalid server environment variables:", error);
    throw new Error("Invalid server environment variables");
  }
}

export const serverEnv = getServerEnvVariables();

export const HOST_STRIPE_PRICE_IDS: Record<HostBillingTier, string> = {
  tier_a: serverEnv.STRIPE_PRICE_ID_TIER_A,
  tier_b: serverEnv.STRIPE_PRICE_ID_TIER_B,
  tier_c: serverEnv.STRIPE_PRICE_ID_TIER_C,
};
