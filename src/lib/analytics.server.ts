"use server";

import "server-only";

import { BillingEventNames, type BillingEventProps } from "@/types/analytics";
import { serverEnv } from "@/lib/env-server";

const AMPLITUDE_ENDPOINT = "https://api2.amplitude.com/2/httpapi";

/**
 * Mirror critical billing events to Amplitude for product analytics
 */
export async function trackServerEvent(
  event: BillingEventProps
): Promise<void> {
  const apiKey = serverEnv.AMPLITUDE_SERVER_API_KEY;
  if (!apiKey) {
    return;
  }

  try {
    const now = Date.now();
    const payload = {
      api_key: apiKey,
      events: [
        {
          event_type: BillingEventNames[event.type] ?? event.type,
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
    };

    const response = await fetch(AMPLITUDE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[Billing] Failed to mirror billing event to Amplitude", {
        status: response.status,
        type: event.type,
      });
    }
  } catch (error) {
    console.error("[Billing] Failed to mirror billing event to Amplitude", {
      error,
      type: event.type,
    });
  }
}

