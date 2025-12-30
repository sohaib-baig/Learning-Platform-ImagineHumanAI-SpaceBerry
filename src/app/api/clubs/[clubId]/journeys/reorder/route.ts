import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  HostGuardError,
  requireEnabledHost,
} from "@/lib/server/hostGuard";

type RouteParams = {
  clubId: string;
};

const reorderSchema = z.object({
  journeyIds: z
    .array(z.string().min(1))
    .min(1)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Journey IDs must be unique."
    ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId } = params;

  if (!clubId) {
    return NextResponse.json(
      { error: "Club ID is required" },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();
    const data = reorderSchema.parse(payload);

    await requireEnabledHost(request, clubId);

    const batch = adminDb.batch();
    const journeysCollection = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys");

    data.journeyIds.forEach((journeyId, index) => {
      const journeyRef = journeysCollection.doc(journeyId);
      batch.update(journeyRef, {
        order: index,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return NextResponse.json({ success: true });
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

    console.error("[Club Journey Reorder] Error:", error);
    return NextResponse.json(
      { error: "Failed to reorder journeys" },
      { status: 500 }
    );
  }
}

