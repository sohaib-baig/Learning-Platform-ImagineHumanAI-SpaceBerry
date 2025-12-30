"use client";

import { useState, useEffect, useCallback } from "react";
import { Journey, Enrollment, Progress } from "@/types/classroom";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { layerColors } from "@/lib/constants";
import { onAuthChange, type User } from "@/lib/auth-client";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface JourneyCardProps {
  journey: Journey;
  enrollment?: Enrollment;
  progress?: Progress;
  totalLessons?: number;
}

export function JourneyCard({
  journey,
  enrollment,
  progress,
  totalLessons,
}: JourneyCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [clientCompletedCount, setClientCompletedCount] = useState<number | null>(null);

  useEffect(() => {
    // Get current user from client-side auth
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchCompletedCount = useCallback(async () => {
    if (user?.uid && journey.id) {
      try {
        const lessonProgressQuery = query(
          collection(db, `users/${user.uid}/progress/${journey.id}/lessons`)
        );
        const lessonProgressSnapshot = await getDocs(lessonProgressQuery);
        const completedCount = lessonProgressSnapshot.docs.filter(
          (doc) => doc.data().isCompleted === true
        ).length;
        setClientCompletedCount(completedCount);
      } catch (err) {
        console.error("Error fetching completed lessons count:", err);
      }
    }
  }, [journey.id, user?.uid]);

  useEffect(() => {
    // Fetch completed lessons count from Firestore
    fetchCompletedCount();
  }, [fetchCompletedCount]);

  // Get completed and total lesson counts
  // Use client-side fetched count if available, otherwise use progress data
  const completedLessons = clientCompletedCount !== null 
    ? clientCompletedCount 
    : progress?.completedLessons ?? progress?.completedCount ?? 0;
  
  // If completedLessons is 0 but we have a lessons object, count completed lessons
  let finalCompletedLessons = completedLessons;
  if (finalCompletedLessons === 0 && progress?.lessons) {
    finalCompletedLessons = Object.values(progress.lessons).filter(
      (status) => status === "complete"
    ).length;
  }
  
  const totalLessonCount = progress?.totalCount ?? totalLessons ?? 0;

  // Calculate progress percentage if available
  const progressPercentage =
    finalCompletedLessons > 0 && totalLessonCount > 0
      ? Math.round((finalCompletedLessons / totalLessonCount) * 100)
      : 0;

  // Check if all lessons are completed
  const isAllCompleted = totalLessonCount > 0 && finalCompletedLessons >= totalLessonCount;

  // Determine button text based on enrollment status
  const buttonText = enrollment
    ? enrollment.status === "completed"
      ? "Review Journey"
      : "Continue Journey"
    : "Start Journey";

  return (
    <Card clickable className="h-full">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {journey.title}
        </h3>
        <span 
          className="inline-block px-2 py-1 text-xs rounded-full" 
          style={{ 
            backgroundColor: layerColors[journey.layer].tag,
            color: "#333"
          }}
        >
          {journey.layer}
        </span>
      </div>

      <p className="mt-2 text-slate-600">{journey.emotionShift}</p>
      <p className="mt-1 text-slate-600 line-clamp-2">{journey.summary}</p>

      {journey.estimatedMinutes && (
        <p className="mt-2 text-sm text-slate-500">
          Est. time: {journey.estimatedMinutes} min
        </p>
      )}

      <div className="mt-4">
        <ProgressBar value={progressPercentage} />
        {isAllCompleted ? (
          <div className="mt-3 flex flex-col items-center gap-2 py-3 px-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-green-700 font-semibold text-sm">
                Journey Completed! 🎉
              </span>
            </div>
            <p className="text-green-600 text-xs text-center">
              Amazing work! You&apos;ve completed all {totalLessonCount} lessons.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-brand hover:underline">{buttonText}</span>
            {totalLessonCount > 0 && (
              <span className="text-sm text-slate-600 font-medium">
                {finalCompletedLessons}/{totalLessonCount} Completed
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
