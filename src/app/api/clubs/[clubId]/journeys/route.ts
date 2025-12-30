import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { firestore } from "firebase-admin";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { HostGuardError, requireEnabledHost } from "@/lib/server/hostGuard";
import { journeyCreateSchema } from "@/lib/validation/journeySchemas";
import { resolveJourneySlug } from "@/lib/journeys/slug";

type RouteParams = {
  clubId: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  if (!clubId) {
    return NextResponse.json({ error: "Club ID is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
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

    const journeysSnap = await adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .orderBy("order", "asc")
      .get();

    const journeys = journeysSnap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title ?? "",
        description: data.description ?? "",
        order: data.order ?? 0,
        summary: data.summary ?? "",
        layer: data.layer ?? "",
        slug: data.slug ?? "",
        isPublished: data.isPublished ?? false,
        isArchived: data.isArchived ?? false,
        emotionShift: data.emotionShift ?? "",
        estimatedMinutes: data.estimatedMinutes ?? null,
        thumbnailUrl: data.thumbnailUrl ?? "",
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      };
    });

    return NextResponse.json({ journeys });
  } catch (error) {
    console.error("[Club Journeys API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch club journeys" },
      { status: 500 }
    );
  }
}

async function getNextJourneyOrder(
  clubId: string,
  tx?: firestore.Transaction
): Promise<number> {
  const journeyOrderQuery = adminDb
    .collection("clubs")
    .doc(clubId)
    .collection("journeys")
    .orderBy("order", "desc")
    .limit(1);

  const snapshot = tx
    ? await tx.get(journeyOrderQuery)
    : await journeyOrderQuery.get();

  if (snapshot.empty) {
    return 0;
  }

  const currentOrder = snapshot.docs[0].data().order;
  return typeof currentOrder === "number" ? currentOrder + 1 : 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  try {
    const payload = await request.json();
    const data = journeyCreateSchema.parse(payload);

    const { uid } = await requireEnabledHost(request, clubId);

    const journeysCollection = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys");
    const nowIso = new Date().toISOString();

    const journeyRef = journeysCollection.doc();

    const { order, slug } = await adminDb.runTransaction(async (tx) => {
      const resolvedOrder =
        data.order !== undefined
          ? data.order
          : await getNextJourneyOrder(clubId, tx);

      const resolvedSlug = await resolveJourneySlug(tx, clubId, data.title);

      tx.set(journeyRef, {
        clubId,
        title: data.title,
        description: data.description ?? "",
        summary: data.summary ?? "",
        layer: data.layer ?? "",
        emotionShift: data.emotionShift ?? "",
        slug: resolvedSlug,
        isPublished: data.isPublished ?? false,
        isArchived: data.isArchived ?? false,
        estimatedMinutes: data.estimatedMinutes ?? null,
        order: resolvedOrder,
        thumbnailUrl: data.thumbnailUrl ?? "",
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { order: resolvedOrder, slug: resolvedSlug };
    });

    return NextResponse.json(
      {
        id: journeyRef.id,
        journey: {
          id: journeyRef.id,
          title: data.title,
          description: data.description ?? "",
          summary: data.summary ?? "",
          layer: data.layer ?? "",
          emotionShift: data.emotionShift ?? "",
          slug,
          isPublished: data.isPublished ?? false,
          isArchived: data.isArchived ?? false,
          estimatedMinutes: data.estimatedMinutes ?? null,
          order,
          thumbnailUrl: data.thumbnailUrl ?? "",
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      },
      { status: 201 }
    );
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

    console.error("[Club Journeys API] Create Error:", error);
    return NextResponse.json(
      { error: "Failed to create journey" },
      { status: 500 }
    );
  }
}
