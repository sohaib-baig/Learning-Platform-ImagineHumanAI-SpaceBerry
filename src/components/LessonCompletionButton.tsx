"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";
import {
  markLessonAsComplete,
  markLessonCompleted,
} from "@/lib/firestore/classroom";

interface LessonCompletionButtonProps {
  uid?: string | null;
  journeyId: string;
  clubId: string;
  lessonId: string;
  lessonTitle: string;
  durationSeconds?: number;
  isInitiallyCompleted?: boolean;
}

export function LessonCompletionButton({
  uid,
  journeyId,
  clubId,
  lessonId,
  lessonTitle,
  durationSeconds,
  isInitiallyCompleted = false,
}: LessonCompletionButtonProps) {
  const [isCompleted, setIsCompleted] = useState(isInitiallyCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!uid || isCompleted || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await markLessonAsComplete(
        uid,
        journeyId,
        lessonId,
        clubId,
        durationSeconds ?? 0
      );

      await markLessonCompleted({
        uid,
        clubId,
        journeyId,
        lessonId,
      });

      analytics.track("lesson_completed", {
        journeyId,
        clubId,
        lessonId,
        title: lessonTitle,
        method: "manual_button",
      });

      setIsCompleted(true);
    } catch (err) {
      console.error("[LessonCompletionButton] Failed to mark completion", err);
      setError("Unable to save completion. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isCompleted ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Completed
        </span>
      ) : uid ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && (
            <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isLoading ? "Saving..." : "Mark as completed"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
        >
          Sign in to mark as completed
        </button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
