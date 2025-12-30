import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import type { firestore } from "firebase-admin";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { snapshotToClubDownload } from "../../helpers";

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

export async function GET(
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
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? undefined;

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

    const clubData = clubSnap.data() as { hostId?: string };
    const downloadData = downloadSnap.data() as {
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

    const fallbackIso = new Date().toISOString();
    const baseDownload = snapshotToClubDownload(downloadSnap, fallbackIso);

    const isFree =
      downloadData?.isFree ??
      !(typeof downloadData?.price === "number" && downloadData.price > 0);

    const purchaseRef = downloadSnap.ref.collection("purchases").doc(uid);
    const purchaseSnap = await purchaseRef.get();

    const alreadyHasAccess = isHost || isFree || purchaseSnap.exists;

    if (alreadyHasAccess) {
      return NextResponse.json({
        download: {
          ...baseDownload,
          hasPurchased: true,
          purchasedAt: purchaseSnap.exists
            ? (() => {
                const purchaseData = purchaseSnap.data() as {
                  updatedAt?: firestore.Timestamp;
                  createdAt?: firestore.Timestamp;
                };
                const timestamp =
                  purchaseData?.updatedAt ??
                  purchaseData?.createdAt ??
                  null;
                return timestamp
                  ? timestamp.toDate().toISOString()
                  : fallbackIso;
              })()
            : fallbackIso,
        },
        url: baseDownload.url,
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Purchase verification required." },
        { status: 403 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (
      session.metadata?.uid !== uid ||
      session.metadata?.clubId !== clubId ||
      session.metadata?.downloadId !== downloadId ||
      session.metadata?.type !== "download"
    ) {
      return NextResponse.json({ error: "Session mismatch." }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed." },
        { status: 402 }
      );
    }

    const amountTotal = session.amount_total ?? 0;
    const currency = (session.currency ?? "aud").toUpperCase();
    const paymentIntentId = session.payment_intent
      ? typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent.id
      : "";

    await purchaseRef.set(
      {
        status: "succeeded",
        amount: amountTotal,
        currency,
        stripe: {
          sessionId: session.id,
          paymentIntentId,
        },
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await adminDb.collection("payments").add({
      uid,
      clubId,
      downloadId,
      type: "download",
      amount: amountTotal,
      currency,
      stripe: {
        sessionId: session.id,
        paymentIntentId,
        status: "succeeded",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      download: {
        ...baseDownload,
        hasPurchased: true,
        purchasedAt: new Date().toISOString(),
      },
      url: baseDownload.url,
    });
  } catch (error) {
    console.error("[Club Download Access] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify download access.",
      },
      { status: 500 }
    );
  }
}

