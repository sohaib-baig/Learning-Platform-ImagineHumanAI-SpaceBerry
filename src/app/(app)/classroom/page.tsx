import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { Suspense } from "react";
import { analytics } from "@/lib/analytics";
import { ClientGuard } from "@/components/ClientGuard";
import {
  getPublishedJourneys,
  getUserEnrollments,
  getUserProgress,
  getLessonsForJourney,
} from "@/lib/firestore/classroom";
import { Layer, Enrollment, Progress } from "@/types/classroom";
import { getServerSession } from "@/lib/auth-server";
import { JourneyCardWrapper } from "@/components/JourneyCardWrapper";
import { JourneyInfoCard } from "@/components/JourneyInfoCard";

// Layer filters
const LAYERS: Layer[] = [
  "Foundation",
  "Expansion",
  "Expression",
  "Mastery",
  "Skill Lab",
];

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse h-48 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8"
        >
          <div className="h-6 w-1/2 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-2/3 bg-slate-200 rounded mb-6"></div>
          <div className="h-1 bg-slate-200 rounded mb-3"></div>
          <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

interface ClassroomProps {
  searchParams: {
    layer?: Layer;
    search?: string;
  };
}

export default async function Classroom({ searchParams }: ClassroomProps) {
  // Track page view
  analytics.track("view_classroom");

  const { layer, search } = searchParams;

  // Get published journeys
  const journeys = await getPublishedJourneys(layer);

  // Filter by search term if provided
  const filteredJourneys = search
    ? journeys.filter(
        (j) =>
          j.title.toLowerCase().includes(search.toLowerCase()) ||
          j.summary.toLowerCase().includes(search.toLowerCase())
      )
    : journeys;

  // Get user session for potential enrollments/progress
  const session = await getServerSession();
  const uid = session?.user?.uid;

  // Get user enrollments and progress if logged in
  let enrollments: Record<string, Enrollment> = {};
  let progressData: Record<string, Progress> = {};
  let journeyLessonCounts: Record<string, number> = {};

  // Get total lesson counts for all journeys
  const lessonCountPromises = filteredJourneys.map(async (journey) => {
    const lessons = await getLessonsForJourney(journey.id, journey.clubId);
    return [journey.id, lessons.length] as const;
  });
  const lessonCountResults = await Promise.all(lessonCountPromises);
  journeyLessonCounts = Object.fromEntries(lessonCountResults);

  if (uid) {
    const userEnrollments = await getUserEnrollments(uid);
    enrollments = Object.fromEntries(
      userEnrollments.map((e) => [e.journeyId, e])
    );

    // Get progress for all journeys (not just enrolled ones, in case user has progress without enrollment)
    const progressPromises = filteredJourneys.map(async (journey) => {
      const progress = await getUserProgress(uid, journey.id);
      return progress ? [journey.id, progress] : null;
    });

    const progressResults = await Promise.all(progressPromises);
    progressData = Object.fromEntries(
      progressResults.filter(Boolean) as [string, Progress][]
    );
  }

  const hasValidLayer = !layer || LAYERS.includes(layer);

  return (
    <ClientGuard>
      <div>
        <PageHeader title="Classroom" subtitle="Browse our learning journeys" />

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Layer Filters */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/classroom"
              className={`
                px-4 py-1 rounded-full text-sm
                ${
                  !layer
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }
              `}
            >
              All Layers
            </Link>

            {LAYERS.map((l) => (
              <Link
                key={l}
                href={`/classroom?layer=${l}`}
                className={`
                  px-4 py-1 rounded-full text-sm
                  ${
                    l === layer
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }
                `}
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Search Box */}
          <form className="w-full md:w-64">
            <input
              type="text"
              name="search"
              placeholder="Search journeys..."
              defaultValue={search}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </form>
        </div>

        {/* Journey Info Card - shows only when a layer is selected */}
        {layer && hasValidLayer && <JourneyInfoCard layer={layer} />}

        <Suspense fallback={<LoadingState />}>
          {filteredJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {filteredJourneys.map((journey) => {
                const enrollment = enrollments[journey.id];
                const progress = progressData[journey.id];
                const totalLessons = journeyLessonCounts[journey.id];

                return (
                  <JourneyCardWrapper
                    key={journey.id}
                    journey={journey}
                    enrollment={enrollment}
                    progress={progress}
                    totalLessons={totalLessons}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              emoji="🧭"
              title={search ? "No matching journeys" : "No journeys available"}
              description={
                layer
                  ? `No ${layer} journeys are available${search ? " matching your search" : ""}. Check back soon!`
                  : search
                    ? "No journeys match your search. Try different keywords or clear the search."
                    : "No journeys are available yet. Check back soon!"
              }
            />
          )}
        </Suspense>
      </div>
    </ClientGuard>
  );
}
