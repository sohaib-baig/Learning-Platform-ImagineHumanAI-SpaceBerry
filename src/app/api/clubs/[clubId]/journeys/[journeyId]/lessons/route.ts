import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  HostGuardError,
  requireEnabledHost,
} from "@/lib/server/hostGuard";
import { lessonCreateSchema } from "@/lib/validation/lessonSchemas";

type RouteParams = {
  clubId: string;
  journeyId: string;
};

export async function GET(
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

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.replace("Bearer", "").trim();

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const [clubSnap, userSnap, journeySnap] = await Promise.all([
      adminDb.collection("clubs").doc(clubId).get(),
      adminDb.collection("users").doc(uid).get(),
      adminDb
        .collection("clubs")
        .doc(clubId)
        .collection("journeys")
        .doc(journeyId)
        .get(),
    ]);

    if (!clubSnap.exists) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (!journeySnap.exists) {
      return NextResponse.json(
        { error: "Journey not found" },
        { status: 404 }
      );
    }

    const clubData = clubSnap.data();
    const userData = userSnap.data();
    const journeyData = journeySnap.data();

    const isHost = clubData?.hostId === uid;
    const isAdminUser = userData?.roles?.admin === true;
    const membershipEntry = userData?.clubMemberships?.[clubId];
    const membershipTrialEnds = membershipEntry?.trialEndsAt?.toDate();
    const now = new Date();
    const isTrialMember =
      membershipEntry?.isTrialing === true &&
      membershipTrialEnds instanceof Date &&
      membershipTrialEnds > now;
    const isActiveMember = membershipEntry?.status === "active";
    const hasMemberAccess =
      isHost || isAdminUser || isActiveMember || isTrialMember;

    if (!hasMemberAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isHost && journeyData?.isPublished === false) {
      return NextResponse.json(
        { error: "Journey is not published" },
        { status: 403 }
      );
    }

    const lessonsSnap = await adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId)
      .collection("lessons")
      .orderBy("order", "asc")
      .get();

    const lessons = lessonsSnap.docs
      .filter((doc) => {
        const data = doc.data();
        if (isHost || isAdminUser) {
          return data.isArchived !== true;
        }
        return data.isPublished === true && data.isArchived !== true;
      })
      .map((doc) => {
        const data = doc.data();
        if (isHost || isAdminUser) {
          return {
            id: doc.id,
            title: data.title ?? "",
            order: data.order ?? 0,
            durationMinutes: data.durationMinutes ?? null,
            videoUrl: data.videoUrl ?? "",
            contentType: data.contentType ?? "video",
            contentBlocks: data.contentBlocks ?? [],
            content: data.content ?? "",
            isPublished: data.isPublished ?? false,
            isArchived: data.isArchived ?? false,
            createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
            updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
          };
        }

        return {
          id: doc.id,
          title: data.title ?? "",
          order: data.order ?? 0,
          durationMinutes: data.durationMinutes ?? null,
          videoUrl: data.videoUrl ?? "",
          contentBlocks: data.contentBlocks ?? [],
          isPublished: data.isPublished ?? false,
        };
      });

    const journey = {
      id: journeySnap.id,
      title: journeyData?.title ?? "",
      description: journeyData?.description ?? "",
      summary: journeyData?.summary ?? "",
      layer: journeyData?.layer ?? "",
      emotionShift: journeyData?.emotionShift ?? "",
      estimatedMinutes: journeyData?.estimatedMinutes ?? null,
      isPublished: journeyData?.isPublished ?? false,
      isArchived: journeyData?.isArchived ?? false,
      order: journeyData?.order ?? 0,
      slug: journeyData?.slug ?? "",
      thumbnailUrl: journeyData?.thumbnailUrl ?? "",
      createdAt: journeyData?.createdAt?.toDate?.().toISOString() ?? null,
      updatedAt: journeyData?.updatedAt?.toDate?.().toISOString() ?? null,
    };

    return NextResponse.json({ journey, lessons });
  } catch (error) {
    console.error("[Club Journey Lessons API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

async function getNextLessonOrder(
  clubId: string,
  journeyId: string
): Promise<number> {
  const snapshot = await adminDb
    .collection("clubs")
    .doc(clubId)
    .collection("journeys")
    .doc(journeyId)
    .collection("lessons")
    .orderBy("order", "desc")
    .limit(1)
    .get();

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
  const { clubId, journeyId } = params;

  if (!clubId || !journeyId) {
    return NextResponse.json(
      { error: "Club ID and Journey ID are required" },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();
    const data = lessonCreateSchema.parse(payload);

    const { uid } = await requireEnabledHost(request, clubId);

    const journeyRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("journeys")
      .doc(journeyId);
    const journeySnap = await journeyRef.get();

    if (!journeySnap.exists) {
      return NextResponse.json(
        { error: "Journey not found" },
        { status: 404 }
      );
    }

    const lessonsCollection = journeyRef.collection("lessons");
    const order = await getNextLessonOrder(clubId, journeyId);

    const nowIso = new Date().toISOString();
    const sanitizedVideoUrl = (data.videoUrl ?? "").trim();
    const sanitizedContent = (data.content ?? "").trim();

    const lessonRef = lessonsCollection.doc();
    await lessonRef.set({
      title: data.title,
      description: data.description ?? "",
      durationMinutes: data.durationMinutes ?? null,
      videoUrl: sanitizedVideoUrl,
      contentType: data.contentType ?? "article",
      contentBlocks: data.contentBlocks ?? [],
      content: sanitizedContent,
      isPublished: data.isPublished ?? false,
      isArchived: data.isArchived ?? false,
      order,
      createdBy: uid,
      clubId,
      journeyId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        id: lessonRef.id,
        lesson: {
          id: lessonRef.id,
          title: data.title,
          description: data.description ?? "",
          durationMinutes: data.durationMinutes ?? null,
          videoUrl: sanitizedVideoUrl,
          contentType: data.contentType ?? "article",
          contentBlocks: data.contentBlocks ?? [],
          content: sanitizedContent,
          isPublished: data.isPublished ?? false,
          isArchived: data.isArchived ?? false,
          order,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      },
      { status: 201 }
    );
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

    console.error("[Club Lesson Create] Error:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}

