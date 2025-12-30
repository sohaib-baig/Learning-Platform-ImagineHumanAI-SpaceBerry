import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { firestore } from "firebase-admin";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  HostGuardError,
  requireEnabledHost,
} from "@/lib/server/hostGuard";
import { journeyUpdateSchema } from "@/lib/validation/journeySchemas";

type RouteParams = {
  clubId: string;
  journeyId: string;
};

function serializeJourney(
  journeyId: string,
  data: firestore.DocumentData
) {
  return {
    id: journeyId,
    title: data.title ?? "",
    description: data.description ?? "",
    summary: data.summary ?? "",
    layer: data.layer ?? "",
    emotionShift: data.emotionShift ?? "",
    slug: data.slug ?? "",
    isPublished: data.isPublished ?? false,
    isArchived: data.isArchived ?? false,
    estimatedMinutes: data.estimatedMinutes ?? null,
    order: data.order ?? 0,
    thumbnailUrl: data.thumbnailUrl ?? "",
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, journeyId } = params;

  if (!clubId || !journeyId) {
    return NextResponse.json(
      { error: "Club ID and Journey ID are required" },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();
    const data = journeyUpdateSchema.parse(payload);

    await requireEnabledHost(request, clubId);

    const journeyRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId);
    const journeySnap = await journeyRef.get();

    if (!journeySnap.exists) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await journeyRef.update(updates);

    const updatedSnap = await journeyRef.get();
    const updatedData = updatedSnap.data()!;

    return NextResponse.json({
      id: journeyId,
      journey: serializeJourney(journeyId, updatedData),
    });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[Club Journey Update] Error:", error);
    return NextResponse.json(
      { error: "Failed to update journey" },
      { status: 500 }
    );
  }
}

async function deleteAllJourneyLessons(
  journeyRef: firestore.DocumentReference
): Promise<void> {
  const lessonsSnap = await journeyRef.collection("lessons").get();

  if (lessonsSnap.empty) {
    return;
  }

  const batchSize = 400;
  let batch = adminDb.batch();
  let operations = 0;

  for (const lessonDoc of lessonsSnap.docs) {
    batch.delete(lessonDoc.ref);
    operations += 1;

    if (operations === batchSize) {
      await batch.commit();
      batch = adminDb.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, journeyId } = params;

  if (!clubId || !journeyId) {
    return NextResponse.json(
      { error: "Club ID and Journey ID are required" },
      { status: 400 }
    );
  }

  try {
    await requireEnabledHost(request, clubId);

    const journeyRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId);
    const journeySnap = await journeyRef.get();

    if (!journeySnap.exists) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    await deleteAllJourneyLessons(journeyRef);
    await journeyRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[Club Journey Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete journey" },
      { status: 500 }
    );
  }
}

