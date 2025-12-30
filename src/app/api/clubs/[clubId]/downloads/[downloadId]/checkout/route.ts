import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

type RouteParams = {
  clubId: string;
  downloadId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, downloadId } = params;

  if (!clubId || !downloadId) {
    return NextResponse.json(
      { error: "Club ID and download ID are required." },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer", "").trim();

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const [clubSnap, downloadSnap, userSnap] = await Promise.all([
      adminDb.collection("clubs").doc(clubId).get(),
      adminDb
        .collection("clubs")
        .doc(clubId)
        .collection("downloads")
        .doc(downloadId)
        .get(),
      adminDb.collection("users").doc(uid).get(),
    ]);

    if (!clubSnap.exists) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }

    if (!downloadSnap.exists) {
      return NextResponse.json({ error: "Download not found." }, { status: 404 });
    }

    const clubData = clubSnap.data() as {
      info?: { slug?: string; name?: string };
      hostId?: string;
    };
    const downloadData = downloadSnap.data() as {
      title?: string;
      description?: string;
      price?: number;
      currency?: string;
      isFree?: boolean;
    };
    const userData = userSnap.data() as { clubsJoined?: string[] } | undefined;

    const isHost = clubData?.hostId === uid;
    const clubsJoined = Array.isArray(userData?.clubsJoined)
      ? (userData!.clubsJoined as string[])
      : [];
    const isMember = clubsJoined.includes(clubId);

    if (!isHost && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const price = typeof downloadData?.price === "number" ? downloadData.price : 0;
    const currency = (downloadData?.currency ?? "AUD").toUpperCase();
    const isFree =
      downloadData?.isFree ??
      !(typeof downloadData?.price === "number" && downloadData.price > 0);

    if (isFree || price <= 0) {
      return NextResponse.json(
        { error: "Download is free. No checkout required." },
        { status: 400 }
      );
    }

    if (isHost) {
      return NextResponse.json(
        { error: "Hosts already have access to this download." },
        { status: 409 }
      );
    }

    const existingPurchaseSnap = await downloadSnap.ref
      .collection("purchases")
      .doc(uid)
      .get();
    if (existingPurchaseSnap.exists) {
      return NextResponse.json(
        { error: "You already own this download." },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const amount = Math.round(price * 100);
    const slug = clubData?.info?.slug ?? clubId;
    const successUrl = `${APP_URL}/club/${slug}/dashboard?downloadId=${downloadId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/club/${slug}/dashboard?tab=downloads`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: decoded.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: downloadData?.title ?? "Digital download",
              description: downloadData?.description ?? "",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        uid,
        clubId,
        downloadId,
        type: "download",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("[Club Download Checkout] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session.",
      },
      { status: 500 }
    );
  }
}

