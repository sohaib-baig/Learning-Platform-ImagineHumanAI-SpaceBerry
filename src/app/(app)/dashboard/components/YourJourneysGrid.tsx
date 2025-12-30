"use client";

import { useState } from "react";
import Link from "next/link";
import type { JourneyCompletion } from "@/hooks/useDashboardData";

interface YourJourneysGridProps {
  enrolled: JourneyCompletion[];
  completed: JourneyCompletion[];
}

/**
 * Journey card component
 */
function JourneyCard({ completion, ctaLabel, ctaHref }: {
  completion: JourneyCompletion;
  ctaLabel: string;
  ctaHref: string;
}) {
  const { journey, completedLessons, totalLessons, percentComplete } = completion;

  return (
    <Link href={ctaHref}>
      <div className="rounded-xl border border-slate-200 bg-white hover:shadow-md transition cursor-pointer p-5">
        {/* Thumbnail */}
        {journey.thumbnailUrl && (
          <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={journey.thumbnailUrl}
              alt={journey.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and layer badge */}
        <div className="mb-2">
          <span className="inline-block text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-700 mb-2">
            {journey.layer}
          </span>
          <h3 className="text-base font-semibold text-slate-900">{journey.title}</h3>
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{journey.summary}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>{completedLessons} of {totalLessons} lessons</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${percentComplete}%` }}
            ></div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-sm font-medium text-brand hover:underline">
          {ctaLabel} →
        </div>
      </div>
    </Link>
  );
}

/**
 * Your Journeys Grid Component (R3)
 * Shows currently enrolled and completed journeys with strict enrollment predicate
 */
export function YourJourneysGrid({ enrolled, completed }: YourJourneysGridProps) {
  const [showCompleted, setShowCompleted] = useState(true);

  // Empty state
  if (enrolled.length === 0 && completed.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Journeys</h2>
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">You haven&apos;t started any journeys yet.</p>
          <Link
            href="/classroom"
            className="inline-block bg-brand text-white hover:opacity-90 rounded-xl px-6 py-2.5 font-medium"
          >
            Explore Journeys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Your Journeys</h2>

      {/* Currently Enrolled Section */}
      {enrolled.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Currently Enrolled
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolled.map((completion) => {
              // CTA: Continue Journey → /classroom/{journeyId}/lesson/{lastLessonId} or first lesson
              const lastLessonId = completion.lastLessonId;
              const ctaHref = lastLessonId
                ? `/classroom/${completion.journey.id}/lesson/${lastLessonId}`
                : `/classroom/${completion.journey.id}`;

              return (
                <JourneyCard
                  key={completion.journey.id}
                  completion={completion}
                  ctaLabel="Continue Journey"
                  ctaHref={ctaHref}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Section (collapsible) */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full text-left mb-4 group"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              Completed ({completed.length})
            </h3>
            <svg
              className={`w-5 h-5 text-slate-600 transition-transform ${
                showCompleted ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.map((completion) => {
                // CTA: Review
                const ctaHref = `/classroom/${completion.journey.id}`;

                return (
                  <JourneyCard
                    key={completion.journey.id}
                    completion={completion}
                    ctaLabel="Review"
                    ctaHref={ctaHref}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

