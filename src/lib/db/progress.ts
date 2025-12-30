import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { isVideoCompleted } from "../mux";
import { analytics } from "../analytics";

/**
 * Progress interface
 */
export interface Progress {
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  watchedSec: number;
  completed: boolean;
  updatedAt: Timestamp; // Firestore Timestamp
}

/**
 * Generate progress ID from user, course and lesson IDs
 */
export function generateProgressId(
  userId: string,
  courseId: string,
  lessonId: string
): string {
  return `${userId}_${courseId}_${lessonId}`;
}

/**
 * Get progress for a specific lesson
 */
export async function getProgress(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<Progress | null> {
  try {
    const progressId = generateProgressId(userId, courseId, lessonId);
    const progressRef = doc(db, "progress", progressId);
    
    const progressSnap = await getDoc(progressRef);
    
    if (!progressSnap.exists()) {
      return null;
    }
    
    return progressSnap.data() as Progress;
  } catch (error) {
    console.error("Error fetching progress:", error);
    return null;
  }
}

/**
 * Save progress for a lesson
 */
export async function saveProgress(
  userId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  watchedSec: number,
  durationSec?: number
): Promise<void> {
  try {
    const progressId = generateProgressId(userId, courseId, lessonId);
    const progressRef = doc(db, "progress", progressId);
    
    // Check if completed
    const completed = durationSec ? isVideoCompleted(watchedSec, durationSec) : false;
    
    // Calculate progress percentage for analytics
    const percent = durationSec ? Math.min(100, Math.round((watchedSec / durationSec) * 100)) : 0;
    
    const progressData = {
      userId,
      courseId,
      moduleId,
      lessonId,
      watchedSec,
      completed,
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(progressRef, progressData, { merge: true });
    
    // Track progress saved event
    analytics.track('progress_saved', { courseId, lessonId, watchedSec, percent });
    
    // Track completion if newly completed
    if (completed) {
      analytics.track('complete_lesson', { courseId, lessonId });
    }
  } catch (error) {
    console.error("Error saving progress:", error);
  }
}

/**
 * Mark a lesson as completed
 */
export async function markCompleted(
  userId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  try {
    const progressId = generateProgressId(userId, courseId, lessonId);
    const progressRef = doc(db, "progress", progressId);
    
    // Get existing progress data or create new
    const progressSnap = await getDoc(progressRef);
    const watchedSec = progressSnap.exists() ? progressSnap.data().watchedSec : 0;
    
    const progressData = {
      userId,
      courseId,
      moduleId,
      lessonId,
      watchedSec,
      completed: true,
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(progressRef, progressData, { merge: true });
    
    // Track completion
    analytics.track('complete_lesson', { courseId, lessonId });
  } catch (error) {
    console.error("Error marking lesson as completed:", error);
  }
}

/**
 * Get recent progress for a user
 */
export async function getRecentProgress(userId: string): Promise<Progress[]> {
  try {
    const progressQuery = query(
      collection(db, "progress"),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
      orderBy("courseId")
    );
    
    const progressSnap = await getDocs(progressQuery);
    
    return progressSnap.docs.map((doc) => doc.data() as Progress);
  } catch (error) {
    console.error("Error fetching recent progress:", error);
    return [];
  }
}

/**
 * Check if a course is completed
 */
export async function checkCourseCompletion(
  userId: string,
  courseId: string,
  totalLessons: number
): Promise<boolean> {
  try {
    const progressQuery = query(
      collection(db, "progress"),
      where("userId", "==", userId),
      where("courseId", "==", courseId),
      where("completed", "==", true)
    );
    
    const progressSnap = await getDocs(progressQuery);
    const completedLessons = progressSnap.size;
    
    if (completedLessons >= totalLessons && totalLessons > 0) {
      // Course is completed
      analytics.track('complete_course', { courseId });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking course completion:", error);
    return false;
  }
}
