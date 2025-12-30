"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getPublishedJourneys,
  getLessonsForJourney,
} from "@/lib/firestore/classroom";
import type {
  Journey,
  Progress,
} from "@/types/classroom";

/**
 * Journey completion data
 */
export interface JourneyCompletion {
  journey: Journey;
  totalLessons: number;
  completedLessons: number;
  lastLessonId?: string;
  updatedAt?: string;
  percentComplete: number;
}

/**
 * Hook to fetch user journey completion data
 * Returns map of journeyId -> completion data
 */
export function useUserJourneyCompletion(uid: string | null) {
  const [completionMap, setCompletionMap] = useState<Record<string, JourneyCompletion>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    async function fetchCompletion() {
      try {
        // Get all published journeys
        const journeys = await getPublishedJourneys();
        
        // For each journey, get progress and lesson counts
        const completionPromises = journeys.map(async (journey) => {
          try {
            // Get total published lessons
            const lessons = await getLessonsForJourney(
              journey.id,
              journey.clubId
            );
            const totalLessons = lessons.length;

            // Get completed lessons from progress subcollection
            const lessonProgressQuery = query(
              collection(db, `users/${uid}/progress/${journey.id}/lessons`),
              where("isCompleted", "==", true)
            );
            const lessonProgressSnapshot = await getDocs(lessonProgressQuery);
            const completedLessons = lessonProgressSnapshot.size;

            // Get journey progress doc for last lesson and updated time
            const progressRef = doc(db, `users/${uid}/progress`, journey.id);
            const progressSnap = await getDoc(progressRef);
            const progressData = progressSnap.data() as Progress | undefined;

            return {
              journeyId: journey.id,
              completion: {
                journey,
                totalLessons,
                completedLessons,
                lastLessonId: progressData?.lastLessonId,
                updatedAt: progressData?.updatedAt,
                percentComplete: totalLessons > 0 
                  ? Math.round((completedLessons / totalLessons) * 100)
                  : 0,
              },
            };
          } catch (err) {
            console.error(`[useUserJourneyCompletion] Error for journey ${journey.id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(completionPromises);
        const map: Record<string, JourneyCompletion> = {};
        results.forEach((result) => {
          if (result) {
            map[result.journeyId] = result.completion;
          }
        });

        setCompletionMap(map);
      } catch (err) {
        console.error("[useUserJourneyCompletion] Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompletion();
  }, [uid]);

  return { completionMap, loading };
}

/**
 * Hook to get currently enrolled journeys (R3 strict predicate)
 * 0 < completedCount < totalCount
 */
export function useCurrentlyEnrolledJourneys(uid: string | null) {
  const { completionMap, loading } = useUserJourneyCompletion(uid);
  const [enrolled, setEnrolled] = useState<JourneyCompletion[]>([]);

  useEffect(() => {
    const enrolledJourneys = Object.values(completionMap).filter(
      (c) => c.completedLessons > 0 && c.completedLessons < c.totalLessons
    );
    setEnrolled(enrolledJourneys);
  }, [completionMap]);

  return { enrolled, loading };
}

/**
 * Hook to get completed journeys
 */
export function useCompletedJourneys(uid: string | null) {
  const { completionMap, loading } = useUserJourneyCompletion(uid);
  const [completed, setCompleted] = useState<JourneyCompletion[]>([]);

  useEffect(() => {
    const completedJourneys = Object.values(completionMap).filter(
      (c) => c.completedLessons > 0 && c.completedLessons === c.totalLessons
    );
    setCompleted(completedJourneys);
  }, [completionMap]);

  return { completed, loading };
}


