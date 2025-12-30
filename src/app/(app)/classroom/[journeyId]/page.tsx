import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import {
  getJourneyById,
  getLessonsForJourney,
  getUserEnrollment,
  getUserProgress,
  getLessonProgress,
} from "@/lib/firestore/classroom";
import { getServerSession } from "@/lib/auth-server";
import { analytics } from "@/lib/analytics";
import { ClientGuard } from "@/components/ClientGuard";
import { enrollInJourney, resumeJourneyPath } from "@/app/classroom/actions";
import type { Journey } from "@/types/classroom";

interface JourneyPageProps {
  params: {
    journeyId: string;
  };
}

export default async function JourneyPage({ params }: JourneyPageProps) {
  const { journeyId } = params;

  // Get journey data
  const journey = await getJourneyById(journeyId);

  if (!journey || !journey.isPublished) {
    notFound();
  }

  const ensuredJourney = journey as Journey;

  // Track page view
  analytics.track("journey_opened", { journeyId, layer: ensuredJourney.layer });

  // Get all lessons for this journey
  const lessons = await getLessonsForJourney(journeyId, ensuredJourney.clubId);

  if (lessons.length === 0) {
    return (
      <ClientGuard>
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            Coming Soon
          </h2>
          <p className="text-slate-600">
            Lessons for this journey are not available yet. Check back soon for
            new content!
          </p>
        </div>
      </ClientGuard>
    );
  }

  // Get user session for enrollment/progress
  const session = await getServerSession();
  const uid = session?.user?.uid;

  // Get user enrollment and progress if logged in
  let enrollment = null;
  let progress = null;
  let nextLessonId = null;
  let lessonProgressByLesson: Record<string, { isCompleted: boolean }> = {};

  if (uid) {
    enrollment = await getUserEnrollment(uid, journeyId);
    progress = await getUserProgress(uid, journeyId);

    // Get progress for all lessons using the new structure
    const progressPromises = lessons.map(async (l) => {
      const lessonProgress = await getLessonProgress(uid, journeyId, l.id);
      return [l.id, lessonProgress ? { isCompleted: lessonProgress.isCompleted } : null];
    });

    const progressResults = await Promise.all(progressPromises);
    lessonProgressByLesson = Object.fromEntries(
      progressResults.filter(([, p]) => p !== null)
    );

    if (progress) {
      // If user has progress, find the next lesson to resume
      if (progress.lastLessonId) {
        nextLessonId = progress.lastLessonId;
      } else if (progress.lastActiveLessonId) {
        nextLessonId = progress.lastActiveLessonId;
      } else {
        // Or get the first incomplete lesson
        const incompleteLesson = lessons
          .sort((a, b) => a.order - b.order)
          .find(l => !lessonProgressByLesson[l.id]?.isCompleted);
        nextLessonId = incompleteLesson?.id || null;
      }
    }
  }

  // If no next lesson found, use the first lesson
  if (!nextLessonId) {
    // Sort by order and get the first one
    nextLessonId = lessons.sort((a, b) => a.order - b.order)[0].id;
  }

  // Redirect to the lesson page
  return redirect(`/classroom/${journeyId}/lesson/${nextLessonId}`);

  // The code below will not execute due to the redirect
  // Keeping it for reference in case we need to return to the previous implementation

  // Calculate progress percentage
  const progressPercentage =
    progress?.completedCount && progress?.totalCount
      ? Math.round((progress.completedCount / progress.totalCount) * 100)
      : 0;

  // Determine button state based on enrollment
  const isEnrolled = !!enrollment;
  const isCompleted = enrollment?.status === "completed";

  // Client action handlers
  const handleEnroll = async () => {
    if (!uid) {
      // Redirect to sign in
      window.location.href =
        "/signin?redirect=" + encodeURIComponent(`/classroom/${journeyId}`);
      return;
    }

    try {
      const result = await enrollInJourney(journeyId);
      if (result.success && result.nextPath) {
        window.location.href = result.nextPath;
      }
    } catch (error) {
      console.error("Failed to enroll:", error);
    }
  };

  const handleResume = async () => {
    if (!uid || !isEnrolled) return;

    const path = await resumeJourneyPath(journeyId);
    window.location.href = path;
  };

  return (
    <ClientGuard>
      <div>
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/classroom"
            className="text-brand hover:underline flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Classroom
          </Link>
        </div>

        {/* Journey header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              {ensuredJourney.title}
            </h1>
            <span className="inline-block px-3 py-1 bg-slate-100 text-sm rounded-full text-slate-700">
              {ensuredJourney.layer}
            </span>
          </div>

          <p className="text-lg text-brand mb-2">{ensuredJourney.emotionShift}</p>

          <p className="text-slate-600">{ensuredJourney.summary}</p>

          {/* Action button and progress */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={isEnrolled ? handleResume : handleEnroll}
              className="px-6 py-2 bg-brand text-white rounded-xl hover:bg-opacity-90 transition"
            >
              {isCompleted
                ? "Review Journey"
                : isEnrolled
                  ? "Resume Journey"
                  : "Start Journey"}
            </button>

            {isEnrolled && progress && (
              <div className="w-full sm:w-64">
                <ProgressBar value={progressPercentage} />
                <div className="mt-1 flex justify-between text-sm text-slate-600">
                  <span>{progressPercentage}% complete</span>
                  {progress.completedCount !== undefined &&
                    progress.totalCount !== undefined && (
                      <span>
                        {progress.completedCount}/{progress.totalCount} lessons
                      </span>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lessons section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Lessons</h2>

          <div className="space-y-3">
            {lessons.length > 0 ? (
              lessons
                .sort((a, b) => a.order - b.order)
                .map((lesson) => {
                  const isCompleted = lessonProgressByLesson[lesson.id]?.isCompleted || false;
                  const lessonStatus = isCompleted ? "complete" : "incomplete";

                  return (
                    <Card key={lesson.id} className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Status indicator */}
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            lessonStatus === "complete"
                              ? "bg-green-500"
                              : "bg-slate-200"
                          }`}
                          aria-label={
                            lessonStatus === "complete"
                              ? "Completed"
                              : "Incomplete"
                          }
                        />

                        <div className="flex-1">
                          <div className="flex flex-wrap justify-between gap-2">
                            <h3 className="font-medium text-slate-900">
                              {lesson.title}
                            </h3>

                            {lesson.durationMinutes && (
                              <span className="text-sm text-slate-500">
                                {lesson.durationMinutes} min
                              </span>
                            )}
                          </div>

                          {lesson.contentType && (
                            <p className="text-sm text-slate-500">
                              {lesson.contentType.charAt(0).toUpperCase() +
                                lesson.contentType.slice(1)}
                            </p>
                          )}
                        </div>

                        {/* Link to lesson */}
                        <Link
                          href={`/classroom/${journeyId}/lesson/${lesson.id}`}
                          className="text-brand hover:underline"
                        >
                          {lessonStatus === "complete" ? "Review" : "Start"}
                        </Link>
                      </div>
                    </Card>
                  );
                })
            ) : (
              <p className="text-slate-600">
                No lessons available for this journey yet.
              </p>
            )}
          </div>
        </div>

        {/* Journey description */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            About this Journey
          </h2>

          <div className="prose prose-slate max-w-none">
            <p>{ensuredJourney.description}</p>
          </div>
        </div>
      </div>
    </ClientGuard>
  );
}
