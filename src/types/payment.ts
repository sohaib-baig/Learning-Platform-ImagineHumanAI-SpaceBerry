import { Timestamp } from "firebase/firestore";

/**
 * Payment type enum
 */
export type PaymentType = "subscription" | "one_time";

/**
 * Stripe payment status
 */
export type StripePaymentStatus =
  | "succeeded"
  | "requires_payment_method"
  | "processing"
  | "incomplete"
  | "canceled"
  | "trialing";

/**
 * Stripe payment details stored in payment record
 */
export interface StripePaymentDetails {
  sessionId: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  paymentIntentId?: string;
  status: StripePaymentStatus;
}

/**
 * Payment document interface
 */
export interface Payment {
  id: string;
  uid: string;
  clubId: string; // Empty string for host_fee payments
  type: PaymentType;
  amount: number; // Amount in cents
  currency: string; // "AUD", "USD", etc.
  stripe: StripePaymentDetails;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment document as stored in Firestore
 */
export interface PaymentDoc {
  uid: string;
  clubId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  stripe: StripePaymentDetails;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payout summary for admin reporting
 */
export interface PayoutSummary {
  clubId: string;
  clubName: string;
  hostId: string;
  totalPayments: number;
  grossAmount: number; // Amount in cents
  currency: string;
  fees?: number; // Platform fees (TBD)
  netAmount?: number; // Net payout amount (TBD)
}

/**
 * Payment filters for admin queries
 */
export interface PaymentFilters {
  dateFrom?: Date;
  dateTo?: Date;
  clubId?: string;
  type?: PaymentType;
  uid?: string;
}

