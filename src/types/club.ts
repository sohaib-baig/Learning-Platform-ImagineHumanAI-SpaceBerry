import { Timestamp } from "firebase/firestore";
import type { OnboardingState } from "./onboarding";

export type HostBillingTier = "tier_a" | "tier_b" | "tier_c";

export interface ClubBillingSoftLimits {
  payingMembers: number;
  videoUploads: number;
  bandwidthGb: number;
}

export interface ClubUsageSnapshot<TTimestamp = string> {
  payingMembers?: number;
  videoUploadsThisMonth?: number;
  bandwidthThisMonthGb?: number;
  loggedAt?: TTimestamp;
  streakOverSoftLimitDays?: number;
  streakBelowThresholdDays?: number;
}

export interface ClubBillingInfo<TTimestamp = string> {
  tier: HostBillingTier;
  transactionFeePercent: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  upgradeScheduledFor?: TTimestamp;
  downgradeEligibleAfter?: TTimestamp;
  upgradeReason?: string;
  downgradeReason?: string;
  warningEmailSentAt?: TTimestamp;
  softLimits: ClubBillingSoftLimits;
  usage?: ClubUsageSnapshot<TTimestamp>;
}

export type ClubMembershipStatus =
  | "trialing"
  | "active"
  | "payment_required"
  | "canceled";

export interface ClubMembership<TTimestamp = string> {
  status: ClubMembershipStatus;
  isTrialing: boolean;
  trialEndsAt?: TTimestamp | null;
  stripeSubscriptionId?: string | null;
  lastPaymentType?: string | null;
  lastPaymentAt?: TTimestamp | null;
  consecutiveFailedPayments?: number;
}

export type ClubMembershipDoc = ClubMembership<Timestamp>;

/**
 * Review interface for club reviews
 */
export interface ClubReview {
  userId: string;
  displayName: string;
  text: string;
  rating: number; // 1..5
  createdAt: string;
}

/**
 * Review document as stored in Firestore
 */
export interface ClubReviewDoc {
  userId: string;
  displayName: string;
  text: string;
  rating: number;
  createdAt: Timestamp;
}

/**
 * Club information
 */
export interface ClubInfo {
  name: string;
  slug: string;
  description: string;
  vision: string;
  mission: string;
  videoUrl?: string;
  bannerUrl?: string;
  profileImageUrl?: string;
  benefits: string[];
  price: number; // major units (e.g., 19.99)
  currency: string; // "AUD", "USD", etc.
  reviews?: ClubReview[];
  recommendedClubs: string[]; // clubIds
  priceChangedAt?: string;
}

export interface ClubBadges {
  activeHost: boolean;
  communityBuilder: boolean;
  featuredByImagineHumans: boolean;
}

export interface ClubMeta {
  badges: ClubBadges;
}

/**
 * Club interface - public content
 */
export interface Club {
  id: string;
  info: ClubInfo;
  hostId: string;
  membersCount: number;
  planType?: string;
  billingTier?: HostBillingTier;
  billing?: ClubBillingInfo;
  maxMembers?: number;
  memberCost?: number;
  pricingLocked?: boolean;
  meta?: ClubMeta;
  createdAt: string;
  updatedAt: string;
}

/**
 * Club document as stored in Firestore
 */
export interface ClubDoc {
  info: {
    name: string;
    slug: string;
    description: string;
    vision: string;
    mission: string;
    videoUrl?: string;
    bannerUrl?: string;
    profileImageUrl?: string;
    benefits: string[];
    price: number;
    currency: string;
    reviews?: ClubReviewDoc[];
    recommendedClubs: string[];
    priceChangedAt?: Timestamp;
  };
  hostId: string;
  membersCount: number;
  planType?: string;
  billingTier?: HostBillingTier;
  billing?: ClubBillingInfo<Timestamp>;
  maxMembers?: number;
  memberCost?: number;
  pricingLocked?: boolean;
  meta?: {
    badges?: ClubBadges;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Club Journey interface (within a club)
 */
export interface ClubJourney {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  slug?: string;
  layer?: string;
  emotionShift?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  estimatedMinutes?: number | null;
  thumbnailUrl?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Club Journey document as stored in Firestore
 */
export interface ClubJourneyDoc {
  title: string;
  description?: string;
  summary?: string;
  slug?: string;
  layer?: string;
  emotionShift?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  estimatedMinutes?: number | null;
  thumbnailUrl?: string;
  order?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Club Download interface
 */
export interface ClubDownload {
  id: string;
  title: string;
  url: string;
  description?: string;
  price?: number;
  currency?: string;
  isFree?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  hasPurchased?: boolean;
  purchasedAt?: string;
}

/**
 * Club Download document as stored in Firestore
 */
export interface ClubDownloadDoc {
  title: string;
  url: string;
  description?: string;
  price?: number;
  currency?: string;
  isFree?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
}

/**
 * User roles
 */
export interface UserRoles {
  user: boolean;
  host: boolean;
  admin?: boolean; // Optional admin role for payouts and management
}

/**
 * User host status
 */
export interface HostStatus {
  enabled: boolean;
  reasonDisabled?: string;
  lastReviewDate?: string;
  billingTier?: HostBillingTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * User host status document as stored in Firestore
 */
export interface HostStatusDoc {
  enabled: boolean;
  reasonDisabled?: string;
  lastReviewDate?: Timestamp;
  billingTier?: HostBillingTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Extended User interface with club fields
 */
export interface UserWithClubs {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  roles: UserRoles;
  hostStatus: HostStatus;
  clubsJoined: string[];
  clubsHosted: string[];
  clubMemberships?: Record<string, ClubMembership>;
  createdAt: string;
  updatedAt: string;
  onboarding?: OnboardingState;
}

/**
 * User document as stored in Firestore
 */
export interface UserDoc {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  roles: UserRoles;
  hostStatus: HostStatusDoc;
  clubsJoined: string[];
  clubsHosted: string[];
  clubMemberships?: Record<string, ClubMembershipDoc>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  onboarding?: OnboardingState;
}
