import type { Timestamp } from "firebase-admin/firestore";

/**
 * ============================================================
 * BILLING ANALYTICS TYPES — FIRESTORE + AMPLITUDE ALIGNMENT
 * ============================================================
 *
 * This file defines the unified type contracts for:
 *  1. Firestore billing analytics documents
 *  2. Amplitude event payloads for financial events
 *  3. Shared business analytics enums used across the platform
 */

/**
 * Firestore document stored under:
 * clubs/{clubId}/analytics_billing/{YYYY-MM}
 *
 * Represents aggregated financial data for one billing month.
 */
export interface BillingAnalyticsDoc {
  /** Count of users who became paid subscribers this month */
  newSubscribers: number;

  /** Total number of currently active paid subscribers in the month */
  activeSubscribers: number;

  /** Count of users who converted from trial → paid this month */
  trialConversions: number;

  /** Count of active trials that were initiated during the month */
  trialStarts?: number;

  /**
   * Count of subscribers who canceled during the month. Optional because older
   * analytics documents may not have tracked this field.
   */
  cancellations?: number;

  /**
   * Sum of all successful Stripe invoice payments in minor units (e.g. cents).
   * UI renderers must divide by 100 when displaying AUD/USD totals.
   */
  totalRevenue: number;

  /** Currency for this club (e.g., 'AUD', 'USD') */
  currency: string;

  /** Firestore server timestamp of the last update */
  updatedAt: Timestamp;
}

/**
 * Billing event types that may trigger analytics increments
 */
export type BillingEventType =
  | "subscription_created"
  | "trial_started"
  | "trial_converted"
  | "invoice_paid"
  | "subscription_canceled"
  | "refund_issued";

/**
 * Common properties shared by all billing analytics events
 */
export interface BillingEventProps {
  /** ID of the club where the billing event occurred */
  clubId: string;

  /** ID of the user linked to the event */
  userId: string;

  /** Stripe invoice/subscription amount (in minor currency units) */
  amount: number;

  /** ISO currency code, e.g. 'AUD' */
  currency: string;

  /** Event type name (see BillingEventType) */
  type: BillingEventType;

  /** Whether this event represents a trial→paid conversion */
  isTrialConversion?: boolean;

  /** Stripe invoice or subscription ID */
  stripeId?: string;

  /** Optional extra metadata for Amplitude */
  [key: string]: unknown;
}

/**
 * Firestore utility types for analytics read/write operations
 */
export interface ClubBillingAnalyticsRef {
  /** Firestore path: clubs/{clubId}/analytics_billing/{YYYY-MM} */
  path: string;

  /** Document data type */
  data: BillingAnalyticsDoc;
}

/**
 * Amplitude event naming conventions for billing analytics
 */
export const BillingEventNames: Record<BillingEventType, string> = {
  subscription_created: "Subscription Created",
  trial_started: "Trial Started",
  trial_converted: "Trial Converted",
  invoice_paid: "Invoice Paid",
  subscription_canceled: "Subscription Canceled",
  refund_issued: "Refund Issued",
};

export type BillingAnalyticsResponse = Omit<
  BillingAnalyticsDoc,
  "updatedAt"
> & {
  /** ISO string representation of the last update */
  updatedAt: string | null;
};
