import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type LessonContentBlock = {
  type: string;
  value: string;
};

export type LessonContent = {
  id: string;
  title: string;
  order: number;
  durationMinutes: number | null;
  videoUrl: string;
  contentBlocks: LessonContentBlock[];
  isPublished: boolean;
  clubId?: string;
  journeyId?: string;
};

type UseLessonArgs = {
  clubId?: string | null;
  journeyId?: string | null;
  lessonId?: string | null;
};

export function useLesson({
  clubId,
  journeyId,
  lessonId,
}: UseLessonArgs): {
  lesson: LessonContent | null;
  loading: boolean;
  error: string | null;
  isAccessBlocked: boolean;
} {
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);

  useEffect(() => {
    if (!clubId || !journeyId || !lessonId) {
      setLesson(null);
      setError(null);
      setIsAccessBlocked(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsAccessBlocked(false);

    const lessonRef = doc(
      db,
      `clubs/${clubId}/journeys/${journeyId}/lessons/${lessonId}`
    );

    const unsubscribe = onSnapshot(
      lessonRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLesson(null);
          setError("Lesson not found.");
          setLoading(false);
          return;
        }

        const data = snapshot.data() as Record<string, unknown>;
        setLesson({
          id: snapshot.id,
          title: (data.title as string) ?? "",
          order: (data.order as number) ?? 0,
          durationMinutes:
            typeof data.durationMinutes === "number"
              ? data.durationMinutes
              : null,
          videoUrl: (data.videoUrl as string) ?? "",
          contentBlocks: Array.isArray(data.contentBlocks)
            ? (data.contentBlocks as LessonContentBlock[])
            : [],
          isPublished: data.isPublished === true,
          clubId: (data.clubId as string) ?? clubId ?? undefined,
          journeyId: (data.journeyId as string) ?? journeyId ?? undefined,
        });
        setError(null);
        setIsAccessBlocked(false);
        setLoading(false);
      },
      (err) => {
        const denied =
          err instanceof FirebaseError && err.code === "permission-denied";
        setLesson(null);
        setLoading(false);
        setIsAccessBlocked(denied);
        setError(
          denied
            ? "Access requires an active membership."
            : "Unable to load this lesson."
        );
      }
    );

    return () => unsubscribe();
  }, [clubId, journeyId, lessonId]);

  return { lesson, loading, error, isAccessBlocked };
}

