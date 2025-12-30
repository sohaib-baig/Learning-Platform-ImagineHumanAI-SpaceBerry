import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { firestore } from "firebase-admin";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  HostGuardError,
  requireEnabledHost,
} from "@/lib/server/hostGuard";
import { downloadCreateSchema } from "@/lib/validation/downloadSchemas";
import { snapshotToClubDownload } from "./helpers";

type RouteParams = {
  clubId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  try {
    const payload = await request.json();
    const data = downloadCreateSchema.parse(payload);

    const { uid } = await requireEnabledHost(request, clubId);

    const downloadsCollection = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("downloads");

    const downloadRef = downloadsCollection.doc();
    const nowIso = new Date().toISOString();

    const isFree = data.isFree ?? (data.price === undefined || data.price === 0);
    const price = isFree ? 0 : data.price ?? 0;
    const currency = (data.currency ?? "AUD").toUpperCase();

    await downloadRef.set({
      title: data.title.trim(),
      description: data.description?.trim() ?? "",
      url: data.url.trim(),
      price,
      currency,
      isFree,
      clubId,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const savedSnapshot = await downloadRef.get();
    const download = snapshotToClubDownload(savedSnapshot, nowIso);

    return NextResponse.json({ download }, { status: 201 });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[Club Downloads API] Create Error:", error);
    return NextResponse.json(
      { error: "Failed to create download" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  if (!clubId) {
    return NextResponse.json(
      { error: "Club ID is required." },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.replace("Bearer", "").trim();

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const [clubSnap, userSnap] = await Promise.all([
      adminDb.collection("clubs").doc(clubId).get(),
      adminDb.collection("users").doc(uid).get(),
    ]);

    if (!clubSnap.exists) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }

    const clubData = clubSnap.data();
    const userData = userSnap.data();

    const isHost = clubData?.hostId === uid;
    const clubsJoined = Array.isArray(userData?.clubsJoined)
      ? (userData!.clubsJoined as string[])
      : [];
    const isMember = clubsJoined.includes(clubId);

    if (!isHost && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const downloadsSnap = await adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("downloads")
      .orderBy("createdAt", "desc")
      .get();

    const fallbackIso = new Date().toISOString();
    const downloads = await Promise.all(
      downloadsSnap.docs.map(async (docSnap) => {
        const baseDownload = snapshotToClubDownload(docSnap, fallbackIso);
        const isFreeDownload =
          baseDownload.isFree ??
          !(typeof baseDownload.price === "number" && baseDownload.price > 0);

        let hasPurchased = isHost || isFreeDownload;
        let purchasedAt: string | undefined;

        if (hasPurchased) {
          purchasedAt = fallbackIso;
        } else {
          const purchaseSnap = await docSnap.ref
            .collection("purchases")
            .doc(uid)
            .get();

          if (purchaseSnap.exists) {
            hasPurchased = true;
            const purchaseData = purchaseSnap.data() as {
              updatedAt?: firestore.Timestamp;
              createdAt?: firestore.Timestamp;
            };
            const timestamp =
              purchaseData?.updatedAt ?? purchaseData?.createdAt ?? null;
            purchasedAt = timestamp
              ? timestamp.toDate().toISOString()
              : fallbackIso;
          }
        }

        return {
          ...baseDownload,
          hasPurchased,
          purchasedAt,
        };
      })
    );

    return NextResponse.json({ downloads });
  } catch (error) {
    console.error("[Club Downloads API] Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch downloads." },
      { status: 500 }
    );
  }
}

