import { Layer } from "@/types/classroom";
import type { ClubBillingSoftLimits, HostBillingTier } from "@/types/club";

export type LayerColorConfig = {
  tag: string;
  background: string;
};

/**
 * Default club that hosts academy-wide journeys.
 */
export const DEFAULT_ACADEMY_CLUB_ID = "oCuLKtZNA9mlC949ZHmW";

export const layerColors: Record<Layer, LayerColorConfig> = {
  Foundation: { tag: '#A7D8F2', background: '#E6F5FA' }, // safety & curiosity
  Expansion:  { tag: '#B9E4C9', background: '#E9F9EF' }, // growth & creation
  Expression: { tag: '#F7C9B6', background: '#FFF0EB' }, // meaning & authenticity
  Mastery:    { tag: '#D4C5F9', background: '#F5F0FF' }, // wisdom & clarity
  "Skill Lab": { tag: '#FAE6A0', background: '#FFF8E1' }, // playful practice
};

export const layerDescriptions: Record<Layer, string> = {
  Foundation: "Begin your journey here. The Foundation layer helps you feel safe, curious, and confident with AI. You'll learn to talk to AI like a human, understand its logic, and start applying it to your real life.",
  Expansion: "Move beyond curiosity into creative mastery. In Expansion, you'll learn to think with AI — designing, building, and co-creating ideas that express your inner logic.",
  Expression: "Here, you learn to create with AI. These journeys focus on voice, emotion, and integrity — turning technology into a mirror for self-expression.",
  Mastery: "Mastery is where AI becomes a reflection of your consciousness. You'll build your own personal AI, design future systems, and explore what it means to lead with imagination and empathy.",
  "Skill Lab": "The Skill Lab is your creative playground — filled with small experiments, tools, and challenges. Each module helps you apply what you've learned in a hands-on, playful way."
};

export const WAITLIST_PATH = "/platform/waitlist";

export const CONSULTING_LINK =
  'https://calendly.com/leaders-imaginehumansai/15min';

export type StripeTierPriceKey =
  | "STRIPE_PRICE_ID_TIER_A"
  | "STRIPE_PRICE_ID_TIER_B"
  | "STRIPE_PRICE_ID_TIER_C";

export type HostBillingTierConfig = {
  tier: HostBillingTier;
  monthlyPriceAud: number;
  transactionFeePercent: number;
  includedPayingMembers: number;
  softLimits: ClubBillingSoftLimits;
  upgradeMembersThreshold: number;
  downgradeMembersThreshold: number;
  priceEnvKey: StripeTierPriceKey;
};

export const HOST_BILLING_TIERS: Record<HostBillingTier, HostBillingTierConfig> = {
  tier_a: {
    tier: "tier_a",
    monthlyPriceAud: 49.99,
    transactionFeePercent: 5,
    includedPayingMembers: 100,
    softLimits: {
      payingMembers: 99,
      videoUploads: 50,
      bandwidthGb: 300,
    },
    upgradeMembersThreshold: 100,
    downgradeMembersThreshold: 100,
    priceEnvKey: "STRIPE_PRICE_ID_TIER_A",
  },
  tier_b: {
    tier: "tier_b",
    monthlyPriceAud: 99,
    transactionFeePercent: 3,
    includedPayingMembers: 500,
    softLimits: {
      payingMembers: 499,
      videoUploads: 200,
      bandwidthGb: 2000,
    },
    upgradeMembersThreshold: 500,
    downgradeMembersThreshold: 100,
    priceEnvKey: "STRIPE_PRICE_ID_TIER_B",
  },
  tier_c: {
    tier: "tier_c",
    monthlyPriceAud: 199,
    transactionFeePercent: 2,
    includedPayingMembers: Number.MAX_SAFE_INTEGER,
    softLimits: {
      payingMembers: Number.MAX_SAFE_INTEGER,
      videoUploads: 1000,
      bandwidthGb: 10000,
    },
    upgradeMembersThreshold: Number.MAX_SAFE_INTEGER,
    downgradeMembersThreshold: 500,
    priceEnvKey: "STRIPE_PRICE_ID_TIER_C",
  },
};

export const HOST_PLAN_DEFAULT_TIER: HostBillingTier = "tier_a";
export const HOST_PLAN_TRIAL_DAYS = 14;
export const HOST_PLAN_WARNING_HOURS = 48;
export const HOST_PLAN_SOFT_LIMIT_GRACE = {
  preUpgradeCheckDays: 7,
  autoUpgradeDays: 14,
  downgradeCooldownDays: 30,
};
