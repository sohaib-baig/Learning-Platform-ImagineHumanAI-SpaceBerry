import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { firestore } from "firebase-admin";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  HostGuardError,
  requireEnabledHost,
} from "@/lib/server/hostGuard";
import { lessonUpdateSchema } from "@/lib/validation/lessonSchemas";

type RouteParams = {
  clubId: string;
  journeyId: string;
  lessonId: string;
};

function serializeLesson(
  lessonId: string,
  data: firestore.DocumentData
) {
  return {
    id: lessonId,
    title: data.title ?? "",
    description: data.description ?? "",
    durationMinutes: data.durationMinutes ?? null,
    videoUrl: data.videoUrl ?? "",
    contentType: data.contentType ?? "article",
    contentBlocks: data.contentBlocks ?? [],
    content: data.content ?? "",
    isPublished: data.isPublished ?? false,
    isArchived: data.isArchived ?? false,
    order: data.order ?? 0,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, journeyId, lessonId } = params;

  if (!clubId || !journeyId || !lessonId) {
    return NextResponse.json(
      { error: "Club ID, Journey ID, and Lesson ID are required" },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();
    const data = lessonUpdateSchema.parse(payload);

    await requireEnabledHost(request, clubId);

    const lessonRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId)
      .collection("lessons")
      .doc(lessonId);

    const lessonSnap = await lessonRef.get();

    if (!lessonSnap.exists) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue;
      }

      if (key === "videoUrl" && typeof value === "string") {
        updates.videoUrl = value.trim();
        continue;
      }

      if (key === "content" && typeof value === "string") {
        updates.content = value.trim();
        continue;
      }

      updates[key] = value;
    }

    await lessonRef.update(updates);

    const updatedSnap = await lessonRef.get();
    const updatedData = updatedSnap.data()!;

    return NextResponse.json({
      id: lessonId,
      lesson: serializeLesson(lessonId, updatedData),
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

    console.error("[Club Lesson Update] Error:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, journeyId, lessonId } = params;

  if (!clubId || !journeyId || !lessonId) {
    return NextResponse.json(
      { error: "Club ID, Journey ID, and Lesson ID are required" },
      { status: 400 }
    );
  }

  try {
    await requireEnabledHost(request, clubId);

    const lessonRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId)
      .collection("lessons")
      .doc(lessonId);

    const lessonSnap = await lessonRef.get();

    if (!lessonSnap.exists) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    await lessonRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[Club Lesson Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}

