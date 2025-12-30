import { loadStripe, Stripe } from "@stripe/stripe-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";
import { FIREBASE_REGION } from "@/lib/firebaseRegion";

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe client instance
 * Singleton pattern to avoid recreating the Stripe object
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error("Stripe publishable key is not defined");
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
};

/**
 * Start checkout flow for club subscription
 * Calls Cloud Function to create Stripe Checkout Session
 */
export async function startClubCheckout(clubId: string): Promise<void> {
  try {
    const functions = getFunctions(app, FIREBASE_REGION);
    const fn = httpsCallable<{ clubId: string }, { id: string }>(
      functions,
      "createCheckoutSessionForClub"
    );

    const res = await fn({ clubId });
    const sessionId = res.data.id;

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error("Failed to load Stripe");
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error starting club checkout:", error);
    throw error;
  }
}

/**
 * Start checkout flow for host onboarding fee ($1)
 * Calls Cloud Function to create Stripe Checkout Session
 */
export async function startHostFeeCheckout(): Promise<void> {
  try {
    const functions = getFunctions(app, FIREBASE_REGION);
    const fn = httpsCallable<Record<string, never>, { id: string }>(
      functions,
      "createCheckoutSessionForHostOneDollar"
    );

    const res = await fn({});
    const sessionId = res.data.id;

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error("Failed to load Stripe");
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error starting host fee checkout:", error);
    throw error;
  }
}

/**
 * Format price for display
 */
export const formatPrice = (price: number, currency: string): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price);
};

/**
 * Format price to cents (Stripe expects amounts in smallest currency unit)
 */
export const toCents = (price: number): number => {
  return Math.round(price * 100);
};

/**
 * Convert cents to dollars
 */
export const fromCents = (cents: number): number => {
  return cents / 100;
};
