"use server";

import { z } from "zod";
import { Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getServerSession } from "@/lib/auth-server";
import { getJourneyById, getLessonsForJourney } from "@/lib/firestore/classroom";
import { analytics } from "@/lib/analytics";

/**
 * Validation schema for journey ID
 */
const journeyIdSchema = z.string().min(1, "Journey ID is required");

/**
 * Enroll a user in a journey
 */
export async function enrollInJourney(journeyId: string) {
  // Validate input
  const parsedJourneyId = journeyIdSchema.parse(journeyId);
  
  // Get current user
  const session = await getServerSession();
  if (!session?.user?.uid) {
    throw new Error("Authentication required");
  }
  
  const uid = session.user.uid;
  const now = Timestamp.now();
  
  try {
    const journey = await getJourneyById(parsedJourneyId);
    if (!journey || !journey.isPublished) {
      throw new Error("Journey not available");
    }

    // Get all lessons for the journey to initialize progress
    const lessons = await getLessonsForJourney(parsedJourneyId, journey.clubId);
    
    if (lessons.length === 0) {
      throw new Error("No published lessons found for this journey");
    }
    
    // Get the first lesson by order
    const firstLesson = lessons.sort((a, b) => a.order - b.order)[0];
    
    // Create enrollment document
    await setDoc(doc(db, `users/${uid}/enrollments`, parsedJourneyId), {
      journeyId: parsedJourneyId,
      status: "enrolled",
      startedAt: now,
      lastActiveLessonId: firstLesson.id,
      updatedAt: now
    });
    
    // Initialize progress document
    const progressData = {
      journeyId: parsedJourneyId,
      lessons: Object.fromEntries(
        lessons.map(lesson => [lesson.id, "incomplete"])
      ),
      lastActiveLessonId: firstLesson.id,
      updatedAt: now,
      completedCount: 0,
      totalCount: lessons.length
    };
    
    await setDoc(doc(db, `users/${uid}/progress`, parsedJourneyId), progressData);
    
    // Track analytics
    analytics.track("enrollment_created", {
      journeyId: parsedJourneyId,
      clubId: journey.clubId,
      lessonCount: lessons.length
    });
    
    // Return the path to the first lesson
    return {
      success: true,
      nextPath: `/classroom/${parsedJourneyId}/lesson/${firstLesson.id}`
    };
  } catch (error) {
    console.error("Error enrolling in journey:", error);
    throw new Error("Failed to enroll in journey");
  }
}

/**
 * Calculate the resume path for a journey
 */
export async function resumeJourneyPath(journeyId: string): Promise<string> {
  // Validate input
  const parsedJourneyId = journeyIdSchema.parse(journeyId);
  
  // Get current user
  const session = await getServerSession();
  if (!session?.user?.uid) {
    // Not logged in, just go to journey detail
    return `/classroom/${parsedJourneyId}`;
  }
  
  const uid = session.user.uid;
  
  try {
    // Check if user is enrolled
    const enrollmentRef = doc(db, `users/${uid}/enrollments`, parsedJourneyId);
    const enrollmentSnap = await getDoc(enrollmentRef);
    
    if (!enrollmentSnap.exists()) {
      // Not enrolled, go to journey detail
      return `/classroom/${parsedJourneyId}`;
    }
    
    const enrollment = enrollmentSnap.data();
    
    // If there's a last active lesson, go there
    if (enrollment.lastActiveLessonId) {
      return `/classroom/${parsedJourneyId}/lesson/${enrollment.lastActiveLessonId}`;
    }
    
    // Otherwise go to journey detail
    return `/classroom/${parsedJourneyId}`;
  } catch (error) {
    console.error("Error calculating resume path:", error);
    // In case of error, just go to journey detail
    return `/classroom/${parsedJourneyId}`;
  }
}
