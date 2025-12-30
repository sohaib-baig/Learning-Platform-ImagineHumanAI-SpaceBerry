import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClubDoc } from "@/types/club";
import { getServerStripeClient } from "@/lib/server-stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST /api/checkout
 * Creates a Stripe checkout session for club membership
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    // Note: In a production app, you'd verify the Firebase token from the request
    const body = await request.json();
    const { clubId } = body;

    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    // Get user ID from Authorization header or Firebase session
    // For now, we'll extract it from the request headers
    const authHeader = request.headers.get("authorization");
    let uid: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      // In production, verify the token with Firebase Admin SDK
      // For now, we'll assume it's the uid
      uid = body.uid || null;
    }

    if (!uid) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get club data
    const clubDocRef = doc(db, "clubs", clubId);
    const clubDocSnap = await getDoc(clubDocRef);

    if (!clubDocSnap.exists()) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const clubData = clubDocSnap.data() as ClubDoc;

    // Create Stripe checkout session
    const stripe = getServerStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: clubData.info.price > 0 ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: clubData.info.currency.toLowerCase(),
            product_data: {
              name: `${clubData.info.name} Membership`,
              description: clubData.info.vision,
            },
            unit_amount: Math.round(clubData.info.price * 100), // Convert to smallest currency unit
            ...(clubData.info.price > 0 && {
              recurring: {
                interval: "month",
              },
            }),
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/club/${clubData.info.slug}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/club/${clubData.info.slug}/overview`,
      metadata: {
        clubId,
        uid,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}

