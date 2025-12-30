import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  JourneyDoc,
  Journey,
  LessonDoc,
  Lesson,
  EnrollmentDoc,
  Enrollment,
  ProgressDoc,
  Progress,
  LessonProgress,
  LessonProgressDoc,
} from "@/types/classroom";

/**
 * Helper function to convert Timestamp to ISO string
 */
const timestampToString = (
  timestamp: Timestamp | undefined
): string | undefined => {
  return timestamp?.toDate().toISOString();
};

/**
 * Helper function to convert ISO string to Timestamp
 */
const stringToTimestamp = (
  dateString: string | undefined
): Timestamp | undefined => {
  return dateString ? Timestamp.fromDate(new Date(dateString)) : undefined;
};

/**
 * Journey converter
 */
export const journeyConverter: FirestoreDataConverter<Journey> = {
  toFirestore(journey: Journey): DocumentData {
    const journeyWithoutId: Omit<Journey, "id"> = (({
      id: _id,
      ...journeyData
    }) => {
      void _id;
      return journeyData;
    })(journey);
    const { clubId, createdAt, updatedAt, ...rest } = journeyWithoutId;
    return {
      ...rest,
      clubId,
      createdAt: stringToTimestamp(createdAt) || Timestamp.now(),
      updatedAt: stringToTimestamp(updatedAt) || Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Journey {
    const data = snapshot.data() as JourneyDoc;
    const { clubId, createdAt, updatedAt, ...rest } = data;
    const inferredClubId = clubId ?? snapshot.ref.parent?.parent?.id ?? "";
    return {
      id: snapshot.id,
      clubId: inferredClubId,
      ...rest,
      createdAt: timestampToString(createdAt) || "",
      updatedAt: timestampToString(updatedAt) || "",
    };
  },
};

/**
 * Lesson converter
 */
export const lessonConverter: FirestoreDataConverter<Lesson> = {
  toFirestore(lesson: Lesson): DocumentData {
    const { id: _id, createdAt, updatedAt, ...rest } = lesson;
    void _id;
    return {
      ...rest,
      createdAt: stringToTimestamp(createdAt) || Timestamp.now(),
      updatedAt: stringToTimestamp(updatedAt) || Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Lesson {
    const data = snapshot.data() as LessonDoc;
    return {
      id: snapshot.id,
      ...data,
      createdAt: timestampToString(data.createdAt) || "",
      updatedAt: timestampToString(data.updatedAt) || "",
    };
  },
};

/**
 * Enrollment converter
 */
export const enrollmentConverter: FirestoreDataConverter<Enrollment> = {
  toFirestore(enrollment: Enrollment): DocumentData {
    const { startedAt, completedAt, updatedAt, ...rest } = enrollment;
    return {
      ...rest,
      startedAt: stringToTimestamp(startedAt),
      completedAt: stringToTimestamp(completedAt),
      updatedAt: stringToTimestamp(updatedAt) || Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Enrollment {
    const data = snapshot.data() as EnrollmentDoc;
    return {
      ...data,
      startedAt: timestampToString(data.startedAt),
      completedAt: timestampToString(data.completedAt),
      updatedAt: timestampToString(data.updatedAt) || "",
    };
  },
};

/**
 * Progress converter
 */
export const progressConverter: FirestoreDataConverter<Progress> = {
  toFirestore(progress: Progress): DocumentData {
    const { updatedAt, ...rest } = progress;
    return {
      ...rest,
      updatedAt: stringToTimestamp(updatedAt) || Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Progress {
    const data = snapshot.data() as ProgressDoc;
    return {
      ...data,
      updatedAt: timestampToString(data.updatedAt) || "",
    };
  },
};

/**
 * LessonProgress converter
 */
export const lessonProgressConverter: FirestoreDataConverter<LessonProgress> = {
  toFirestore(progress: LessonProgress): DocumentData {
    const { completedAt, updatedAt, ...rest } = progress;
    return {
      ...rest,
      completedAt: stringToTimestamp(completedAt),
      updatedAt: stringToTimestamp(updatedAt) || Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): LessonProgress {
    const data = snapshot.data() as LessonProgressDoc;
    return {
      ...data,
      completedAt: timestampToString(data.completedAt),
      updatedAt: timestampToString(data.updatedAt) || "",
    };
  },
};
