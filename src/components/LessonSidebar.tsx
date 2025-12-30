"use client";

import { useState, useEffect } from "react";
import type { LessonProgress } from "@/types/classroom";
import Link from "next/link";
import { ProgressBar } from "./ProgressBar";
import { getLessonProgress } from "@/lib/firestore/classroom";
import { onAuthChange, type User } from "@/lib/auth-client";

interface SidebarLesson {
  id: string;
  title: string;
  order: number;
  durationMinutes?: number;
}

interface LessonSidebarProps {
  journeyId: string;
  lessons: SidebarLesson[];
  currentLessonId?: string;
  lessonProgress?: Record<string, LessonProgress>;
}

export function LessonSidebar({
  journeyId,
  lessons,
  currentLessonId,
  lessonProgress = {},
}: LessonSidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [clientLessonProgress, setClientLessonProgress] =
    useState<Record<string, LessonProgress>>(lessonProgress);

  useEffect(() => {
    // Get current user from client-side auth
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchAllLessonProgress = async () => {
    if (user?.uid) {
      try {
        const progressPromises = lessons.map(async (lesson) => {
          const progress = await getLessonProgress(
            user.uid,
            journeyId,
            lesson.id
          );
          return progress ? [lesson.id, progress] : null;
        });

        const progressResults = await Promise.all(progressPromises);
        const progressMap = Object.fromEntries(
          progressResults.filter(
            (result): result is [string, LessonProgress] => result !== null
          )
        );
        setClientLessonProgress(progressMap);
      } catch (err) {
        console.error("Error fetching lesson progress:", err);
      }
    }
  };

  useEffect(() => {
    // Fetch completion status for all lessons when user is available
    fetchAllLessonProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, journeyId]);

  // Merge server-side progress with client-side progress (client-side takes precedence)
  const mergedProgress = { ...lessonProgress, ...clientLessonProgress };

  // Sort lessons by order
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-medium text-slate-900">Lessons</h2>
      </div>

      <div className="divide-y divide-slate-200">
        {sortedLessons.map((lesson) => {
          const progress = mergedProgress[lesson.id];
          const isActive = currentLessonId === lesson.id;
          const isCompleted = progress?.isCompleted || false;
          const percentWatched = progress?.percentWatched || 0;

          return (
            <Link
              key={lesson.id}
              href={`/classroom/${journeyId}/lesson/${lesson.id}`}
              className={`block p-4 hover:bg-slate-50 transition ${
                isActive ? "bg-slate-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
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
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        isActive
                          ? "border-brand"
                          : percentWatched > 0
                            ? "border-amber-400"
                            : "border-slate-300"
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3
                      className={`font-medium ${
                        isActive ? "text-brand" : "text-slate-900"
                      }`}
                    >
                      {lesson.title}
                    </h3>

                    {lesson.durationMinutes && (
                      <span className="text-xs text-slate-500 mt-0.5">
                        {lesson.durationMinutes} min
                      </span>
                    )}
                  </div>

                  {percentWatched > 0 && !isCompleted && (
                    <div className="mt-2">
                      <ProgressBar value={percentWatched} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
