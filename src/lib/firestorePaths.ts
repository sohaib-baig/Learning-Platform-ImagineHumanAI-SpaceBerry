import { collection, doc, type CollectionReference, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Build Firestore document path for a club.
 */
export function clubDocPath(clubId: string): string {
  return `clubs/${clubId}`;
}

/**
 * Build Firestore collection path for a club's journeys.
 */
export function clubJourneysCollectionPath(clubId: string): string {
  return `${clubDocPath(clubId)}/journeys`;
}

/**
 * Build Firestore document path for a specific journey in a club.
 */
export function clubJourneyDocPath(clubId: string, journeyId: string): string {
  return `${clubJourneysCollectionPath(clubId)}/${journeyId}`;
}

/**
 * Build Firestore collection path for lessons inside a journey.
 */
export function clubJourneyLessonsCollectionPath(
  clubId: string,
  journeyId: string
): string {
  return `${clubJourneyDocPath(clubId, journeyId)}/lessons`;
}

/**
 * Build Firestore document path for a specific lesson inside a journey.
 */
export function clubJourneyLessonDocPath(
  clubId: string,
  journeyId: string,
  lessonId: string
): string {
  return `${clubJourneyLessonsCollectionPath(clubId, journeyId)}/${lessonId}`;
}

/**
 * Build Firestore collection path for club downloads.
 */
export function clubDownloadsCollectionPath(clubId: string): string {
  return `${clubDocPath(clubId)}/downloads`;
}

/**
 * Build Firestore document path for a specific club download.
 */
export function clubDownloadDocPath(clubId: string, downloadId: string): string {
  return `${clubDownloadsCollectionPath(clubId)}/${downloadId}`;
}

/**
 * Build storage path for a club download attachment.
 */
export function clubDownloadStoragePath(
  clubId: string,
  downloadId: string,
  filename: string
): string {
  return `club-downloads/${clubId}/${downloadId}/${filename}`;
}

/**
 * Get typed document reference for a club.
 */
export function clubDocRef<T = unknown>(clubId: string): DocumentReference<T> {
  return doc(db, "clubs", clubId) as DocumentReference<T>;
}

/**
 * Get typed collection reference for a club's journeys.
 */
export function clubJourneysCollectionRef<T = unknown>(
  clubId: string
): CollectionReference<T> {
  return collection(db, "clubs", clubId, "journeys") as CollectionReference<T>;
}

/**
 * Get typed document reference for a specific journey.
 */
export function clubJourneyDocRef<T = unknown>(
  clubId: string,
  journeyId: string
): DocumentReference<T> {
  return doc(db, "clubs", clubId, "journeys", journeyId) as DocumentReference<T>;
}

/**
 * Get typed collection reference for lessons within a journey.
 */
export function clubJourneyLessonsCollectionRef<T = unknown>(
  clubId: string,
  journeyId: string
): CollectionReference<T> {
  return collection(
    db,
    "clubs",
    clubId,
    "journeys",
    journeyId,
    "lessons"
  ) as CollectionReference<T>;
}

/**
 * Get typed document reference for a specific lesson.
 */
export function clubJourneyLessonDocRef<T = unknown>(
  clubId: string,
  journeyId: string,
  lessonId: string
): DocumentReference<T> {
  return doc(
    db,
    "clubs",
    clubId,
    "journeys",
    journeyId,
    "lessons",
    lessonId
  ) as DocumentReference<T>;
}

/**
 * Build Firestore collection path for per-user lesson progress entries.
 */
export function clubLessonProgressCollectionPath(
  clubId: string,
  journeyId: string,
  lessonId: string
): string {
  return `${clubJourneyLessonDocPath(clubId, journeyId, lessonId)}/progress`;
}

/**
 * Build Firestore document path for a user's lesson progress entry.
 */
export function clubLessonProgressDocPath(
  clubId: string,
  journeyId: string,
  lessonId: string,
  uid: string
): string {
  return `${clubLessonProgressCollectionPath(clubId, journeyId, lessonId)}/${uid}`;
}

/**
 * Get typed collection reference for lesson progress entries.
 */
export function clubLessonProgressCollectionRef<T = unknown>(
  clubId: string,
  journeyId: string,
  lessonId: string
): CollectionReference<T> {
  return collection(
    db,
    "clubs",
    clubId,
    "journeys",
    journeyId,
    "lessons",
    lessonId,
    "progress"
  ) as CollectionReference<T>;
}

/**
 * Get typed document reference for a user's lesson progress entry.
 */
export function clubLessonProgressDocRef<T = unknown>(
  clubId: string,
  journeyId: string,
  lessonId: string,
  uid: string
): DocumentReference<T> {
  return doc(
    db,
    "clubs",
    clubId,
    "journeys",
    journeyId,
    "lessons",
    lessonId,
    "progress",
    uid
  ) as DocumentReference<T>;
}

/**
 * Get typed collection reference for club downloads.
 */
export function clubDownloadsCollectionRef<T = unknown>(
  clubId: string
): CollectionReference<T> {
  return collection(db, "clubs", clubId, "downloads") as CollectionReference<T>;
}

/**
 * Get typed document reference for a specific download.
 */
export function clubDownloadDocRef<T = unknown>(
  clubId: string,
  downloadId: string
): DocumentReference<T> {
  return doc(db, "clubs", clubId, "downloads", downloadId) as DocumentReference<T>;
}

