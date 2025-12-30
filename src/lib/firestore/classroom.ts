import {
  collection,
  collectionGroup,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_ACADEMY_CLUB_ID } from "../constants";
import {
  journeyConverter,
  lessonConverter,
  enrollmentConverter,
  progressConverter,
  lessonProgressConverter,
} from "./converters";
import {
  Journey,
  Lesson,
  Enrollment,
  Progress,
  Layer,
  LessonProgress,
  LessonCompletionProgressDoc,
} from "@/types/classroom";
import { clubLessonProgressDocRef } from "../firestorePaths";

/**
 * Get all published journeys
 */
export async function getPublishedJourneys(
  filterLayer?: Layer,
  clubId: string = DEFAULT_ACADEMY_CLUB_ID
): Promise<Journey[]> {
  try {
    const baseQuery = collectionGroup(db, "journeys").withConverter(
      journeyConverter
    );
    const constraints: QueryConstraint[] = [
      where("isPublished", "==", true),
      where("clubId", "==", clubId),
      orderBy("order", "asc"),
    ];

    if (filterLayer) {
      constraints.splice(2, 0, where("layer", "==", filterLayer));
    }

    const journeysQuery = query(baseQuery, ...constraints);
    const snapshot = await getDocs(journeysQuery);
    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error fetching published journeys:", error);
    return [];
  }
}

/**
 * Get journey by ID
 */
export async function getJourneyById(
  journeyId: string,
  clubId?: string
): Promise<Journey | null> {
  try {
    const baseQuery = collectionGroup(db, "journeys").withConverter(
      journeyConverter
    );
    const constraints: QueryConstraint[] = [
      where(documentId(), "==", journeyId),
      limit(1),
    ];
    if (clubId) {
      constraints.splice(1, 0, where("clubId", "==", clubId));
    }
    const journeyQuery = query(baseQuery, ...constraints);
    const snapshot = await getDocs(journeyQuery);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    console.error(`Error fetching journey with ID ${journeyId}:`, error);
    return null;
  }
}

/**
 * Get journey by slug
 */
export async function getJourneyBySlug(
  slug: string,
  clubId: string = DEFAULT_ACADEMY_CLUB_ID
): Promise<Journey | null> {
  try {
    const journeysQuery = query(
      collectionGroup(db, "journeys").withConverter(journeyConverter),
      where("slug", "==", slug),
      where("clubId", "==", clubId),
      where("isPublished", "==", true),
      limit(1)
    );

    const snapshot = await getDocs(journeysQuery);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    console.error(`Error fetching journey with slug ${slug}:`, error);
    return null;
  }
}

async function resolveClubIdForJourney(
  journeyId: string,
  clubIdHint?: string
): Promise<string | null> {
  if (clubIdHint) {
    return clubIdHint;
  }

  const journey = await getJourneyById(journeyId);
  return journey?.clubId ?? null;
}

/**
 * Get published lessons for a journey
 */
export async function getLessonsForJourney(
  journeyId: string,
  clubId?: string
): Promise<Lesson[]> {
  try {
    const resolvedClubId = clubId ?? (await resolveClubIdForJourney(journeyId));
    if (!resolvedClubId) {
      console.warn(
        `[classroom] Unable to resolve clubId for journey ${journeyId}`
      );
      return [];
    }

    const lessonsQuery = query(
      collection(
        db,
        `clubs/${resolvedClubId}/journeys/${journeyId}/lessons`
      ).withConverter(lessonConverter),
      where("isPublished", "==", true),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(lessonsQuery);
    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error(`Error fetching lessons for journey ${journeyId}:`, error);
    return [];
  }
}

/**
 * Get a specific lesson by ID
 */
export async function getLessonById(
  journeyId: string,
  lessonId: string,
  clubId?: string
): Promise<Lesson | null> {
  try {
    const resolvedClubId = clubId ?? (await resolveClubIdForJourney(journeyId));
    if (!resolvedClubId) {
      console.warn(
        `[classroom] Unable to resolve clubId for journey ${journeyId}`
      );
      return null;
    }

    const docRef = doc(
      db,
      `clubs/${resolvedClubId}/journeys/${journeyId}/lessons`,
      lessonId
    ).withConverter(lessonConverter);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data();
  } catch (error) {
    console.error(
      `Error fetching lesson ${lessonId} for journey ${journeyId}:`,
      error
    );
    return null;
  }
}

/**
 * Get user enrollment for a journey
 */
export async function getUserEnrollment(
  uid: string,
  journeyId: string
): Promise<Enrollment | null> {
  try {
    const docRef = doc(db, `users/${uid}/enrollments`, journeyId).withConverter(
      enrollmentConverter
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data();
  } catch (error) {
    console.error(
      `Error fetching enrollment for user ${uid}, journey ${journeyId}:`,
      error
    );
    return null;
  }
}

/**
 * Get all user enrollments
 */
export async function getUserEnrollments(uid: string): Promise<Enrollment[]> {
  try {
    const enrollmentsQuery = query(
      collection(db, `users/${uid}/enrollments`).withConverter(
        enrollmentConverter
      ),
      orderBy("updatedAt", "desc")
    );

    const snapshot = await getDocs(enrollmentsQuery);
    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error(`Error fetching enrollments for user ${uid}:`, error);
    return [];
  }
}

/**
 * Get user progress for a journey
 */
export async function getUserProgress(
  uid: string,
  journeyId: string
): Promise<Progress | null> {
  try {
    const docRef = doc(db, `users/${uid}/progress`, journeyId).withConverter(
      progressConverter
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data();
  } catch (error) {
    console.error(
      `Error fetching progress for user ${uid}, journey ${journeyId}:`,
      error
    );
    return null;
  }
}

/**
 * Calculate resume path for a journey
 */
export function calculateResumePath(
  journeyId: string,
  lastLessonId?: string
): string {
  if (lastLessonId) {
    return `/classroom/${journeyId}/lesson/${lastLessonId}`;
  }
  return `/classroom/${journeyId}`;
}

/**
 * Get lesson progress for a specific lesson
 */
export async function getLessonProgress(
  uid: string,
  journeyId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  try {
    const docRef = doc(
      db,
      `users/${uid}/progress/${journeyId}/lessons`,
      lessonId
    ).withConverter(lessonProgressConverter);

    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data();
  } catch (error) {
    console.error(`Error fetching lesson progress for ${lessonId}:`, error);
    return null;
  }
}

/**
 * Update lesson progress
 */
export async function updateLessonProgress(
  uid: string,
  journeyId: string,
  lessonId: string,
  data: Partial<LessonProgress>
): Promise<void> {
  try {
    const docRef = doc(
      db,
      `users/${uid}/progress/${journeyId}/lessons`,
      lessonId
    );

    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error updating lesson progress for ${lessonId}:`, error);
    throw error;
  }
}

/**
 * Mark lesson as complete
 */
export async function markLessonAsComplete(
  uid: string,
  journeyId: string,
  lessonId: string,
  clubId: string,
  videoDuration = 0
): Promise<void> {
  try {
    const docRef = doc(
      db,
      `users/${uid}/progress/${journeyId}/lessons`,
      lessonId
    );

    await setDoc(
      docRef,
      {
        isCompleted: true,
        percentWatched: 100,
        watchedSeconds: videoDuration,
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    // Update the journey progress doc
    const journeyProgressRef = doc(db, `users/${uid}/progress`, journeyId);

    // Get all lessons for this journey
    const lessons = await getLessonsForJourney(journeyId, clubId);
    const totalLessons = lessons.length;

    // Get all lesson progress docs
    const lessonProgressQuery = query(
      collection(db, `users/${uid}/progress/${journeyId}/lessons`)
    );

    const lessonProgressSnapshot = await getDocs(lessonProgressQuery);
    const completedLessonsRaw = lessonProgressSnapshot.docs.filter(
      (doc) => doc.data().isCompleted
    ).length;
    const completedLessons =
      totalLessons > 0 ? Math.min(completedLessonsRaw, totalLessons) : 0;
    const percentComplete =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    if (totalLessons === 0) {
      console.warn(
        `[classroom] markLessonAsComplete: No lessons found for journey ${journeyId} in club ${clubId}`
      );
    }

    // Update journey progress
    await setDoc(
      journeyProgressRef,
      {
        journeyId,
        completedLessons,
        totalLessons,
        lastLessonId: lessonId,
        percentComplete,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error marking lesson ${lessonId} as complete:`, error);
    throw error;
  }
}

type MarkLessonCompletedParams = {
  uid: string;
  clubId: string;
  journeyId: string;
  lessonId: string;
};

/**
 * Record a per-user lesson completion inside the lesson's progress subcollection.
 * Uses merge writes to remain idempotent.
 */
export async function markLessonCompleted({
  uid,
  clubId,
  journeyId,
  lessonId,
}: MarkLessonCompletedParams): Promise<void> {
  const docRef = clubLessonProgressDocRef<LessonCompletionProgressDoc>(
    clubId,
    journeyId,
    lessonId,
    uid
  );

  try {
    const snapshot = await getDoc(docRef);
    const existing = snapshot.exists() ? snapshot.data() : null;

    const payload: Record<string, unknown> = {
      uid,
      clubId,
      journeyId,
      lessonId,
      status: "completed",
      updatedAt: serverTimestamp(),
    };

    if (!existing?.startedAt) {
      payload.startedAt = serverTimestamp();
    }

    if (!existing?.completedAt) {
      payload.completedAt = serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error(
      `[classroom] Failed to write lesson completion for ${lessonId} (${uid}):`,
      error
    );
    throw error;
  }
}

/**
 * Save reflection text
 */
export async function saveReflection(
  uid: string,
  journeyId: string,
  lessonId: string,
  reflectionText: string
): Promise<void> {
  try {
    const docRef = doc(
      db,
      `users/${uid}/progress/${journeyId}/lessons`,
      lessonId
    );

    // Get current doc to check if it exists and to get current reflectionCount
    const docSnap = await getDoc(docRef);
    const currentData = docSnap.exists() ? docSnap.data() : {};

    await setDoc(
      docRef,
      {
        reflectionText,
        reflectionCount: (currentData.reflectionCount || 0) + 1,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error saving reflection for lesson ${lessonId}:`, error);
    throw error;
  }
}

/**
 * Update video progress
 */
export async function updateJourneyProgress(
  uid: string,
  journeyId: string,
  clubId: string
): Promise<void> {
  try {
    // Get all lessons for this journey
    const lessons = await getLessonsForJourney(journeyId, clubId);
    const totalLessons = lessons.length;

    // Get all lesson progress docs
    const lessonProgressQuery = query(
      collection(db, `users/${uid}/progress/${journeyId}/lessons`)
    );

    const lessonProgressSnapshot = await getDocs(lessonProgressQuery);
    const completedLessonsRaw = lessonProgressSnapshot.docs.filter(
      (doc) => doc.data().isCompleted
    ).length;
    const completedLessons =
      totalLessons > 0 ? Math.min(completedLessonsRaw, totalLessons) : 0;
    const percentComplete =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    if (totalLessons === 0) {
      console.warn(
        `[classroom] updateJourneyProgress: No lessons found for journey ${journeyId} in club ${clubId}`
      );
    }

    // Update journey progress
    const journeyProgressRef = doc(db, `users/${uid}/progress`, journeyId);

    await setDoc(
      journeyProgressRef,
      {
        journeyId,
        completedLessons,
        totalLessons,
        percentComplete,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error updating journey progress for ${journeyId}:`, error);
    throw error;
  }
}
