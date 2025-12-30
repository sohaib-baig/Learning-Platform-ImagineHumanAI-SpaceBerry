import { Timestamp } from "firebase/firestore";

/**
 * Layer types for journeys
 */
export type Layer =
  | "Foundation"
  | "Expansion"
  | "Expression"
  | "Mastery"
  | "Skill Lab";

/**
 * Journey interface - public content
 */
export interface Journey {
  id: string;
  clubId: string;
  title: string;
  slug: string;
  layer: Layer;
  emotionShift: string;
  summary: string;
  description: string;
  order: number;
  isPublished: boolean;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  mapNodeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Journey document as stored in Firestore
 */
export interface JourneyDoc {
  clubId?: string;
  title: string;
  slug: string;
  layer: Layer;
  emotionShift: string;
  summary: string;
  description: string;
  order: number;
  isPublished: boolean;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  mapNodeIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Lesson interface - public content
 */
export interface Lesson {
  id: string;
  title: string;
  order: number;
  description?: string;
  durationMinutes?: number;
  videoUrl?: string;
  contentType: "video" | "article" | "exercise";
  contentBlocks?: Array<{ type: "md" | "tip" | "exercise"; value: string }>;
  content?: string;
  isPublished: boolean;
  isArchived?: boolean;
  mapNodeRefs?: Array<{ nodeId: string; weight?: number }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lesson document as stored in Firestore
 */
export interface LessonDoc {
  title: string;
  order: number;
  description?: string;
  durationMinutes?: number;
  videoUrl?: string;
  contentType: "video" | "article" | "exercise";
  contentBlocks?: Array<{ type: "md" | "tip" | "exercise"; value: string }>;
  isPublished: boolean;
  isArchived?: boolean;
  content?: string;
  mapNodeRefs?: Array<{ nodeId: string; weight?: number }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * User enrollment state
 */
export interface Enrollment {
  journeyId: string;
  status: "enrolled" | "completed";
  startedAt?: string;
  completedAt?: string;
  lastActiveLessonId?: string;
  updatedAt: string;
}

/**
 * Enrollment document as stored in Firestore
 */
export interface EnrollmentDoc {
  journeyId: string;
  status: "enrolled" | "completed";
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastActiveLessonId?: string;
  updatedAt: Timestamp;
}

/**
 * User progress for a journey
 */
export interface Progress {
  journeyId: string;
  lessons: Record<string, "complete" | "incomplete">;
  lastActiveLessonId?: string;
  updatedAt: string;
  completedCount?: number;
  totalCount?: number;
  percentComplete?: number;
  completedLessons?: number;
  lastLessonId?: string;
}

/**
 * Progress document as stored in Firestore
 */
export interface ProgressDoc {
  journeyId: string;
  lessons: Record<string, "complete" | "incomplete">;
  lastActiveLessonId?: string;
  updatedAt: Timestamp;
  completedCount?: number;
  totalCount?: number;
  percentComplete?: number;
  completedLessons?: number;
  lastLessonId?: string;
}

/**
 * Helper function to get the next incomplete lesson
 */
export function getNextIncomplete(
  journey: Journey,
  lessons: Lesson[],
  progress: Progress
): string | null {
  const byOrder = [...lessons].sort((a, b) => a.order - b.order);

  for (const lesson of byOrder) {
    if (progress.lessons[lesson.id] !== "complete") {
      return lesson.id;
    }
  }

  return null;
}

/**
 * Lesson Progress interface
 */
export interface LessonProgress {
  watchedSeconds: number;
  videoDurationSeconds: number;
  percentWatched: number;
  isCompleted: boolean;
  lastPlaybackPosition: number;
  reflectionText?: string;
  reflectionCount?: number;
  completedAt?: string;
  updatedAt: string;
}

/**
 * Lesson Progress document as stored in Firestore
 */
export interface LessonProgressDoc {
  watchedSeconds: number;
  videoDurationSeconds: number;
  percentWatched: number;
  isCompleted: boolean;
  lastPlaybackPosition: number;
  reflectionText?: string;
  reflectionCount?: number;
  completedAt?: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Lesson completion progress (per user per lesson)
 */
export type LessonProgressStatus = "not_started" | "completed";

export interface LessonCompletionProgress {
  uid: string;
  clubId: string;
  journeyId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface LessonCompletionProgressDoc {
  uid: string;
  clubId: string;
  journeyId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  updatedAt: Timestamp;
}
