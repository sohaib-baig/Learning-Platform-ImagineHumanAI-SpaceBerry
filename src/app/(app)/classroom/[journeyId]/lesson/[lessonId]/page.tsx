import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getJourneyById,
  getLessonById,
  getLessonsForJourney,
  getUserProgress,
  getLessonProgress,
} from "@/lib/firestore/classroom";
import { getServerSession } from "@/lib/auth-server";
import { analytics } from "@/lib/analytics";
import { ClientGuard } from "@/components/ClientGuard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonSidebar } from "@/components/LessonSidebar";
import { ProgressBar } from "@/components/ProgressBar";
import { JourneyInfoCard } from "@/components/JourneyInfoCard";
import { LessonProgress } from "@/types/classroom";
import { LessonCompletionButton } from "@/components/LessonCompletionButton";

interface LessonPageProps {
  params: {
    journeyId: string;
    lessonId: string;
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { journeyId, lessonId } = params;

  // Get journey data
  const journey = await getJourneyById(journeyId);

  if (!journey || !journey.isPublished) {
    return notFound();
  }

  // Get all lessons for this journey
  const allLessons = await getLessonsForJourney(journey.id, journey.clubId);

  // Get the specific lesson
  const lesson = await getLessonById(journey.id, lessonId, journey.clubId);

  if (!lesson || !lesson.isPublished) {
    return notFound();
  }

  // Track page view
  analytics.track("view_lesson", { journeyId: journey.id, lessonId });

  // Get user session for progress
  const session = await getServerSession();
  const uid = session?.user?.uid;

  // Get user progress data if logged in
  let journeyProgress = null;
  let lessonProgress = null;
  let lessonProgressByLesson: Record<string, LessonProgress> = {};

  if (uid) {
    // Get journey progress
    journeyProgress = await getUserProgress(uid, journey.id);

    // Get current lesson progress
    lessonProgress = await getLessonProgress(uid, journey.id, lessonId);

    // Get progress for all lessons for sidebar
    const progressPromises = allLessons.map(async (l) => {
      const progress = await getLessonProgress(uid, journey.id, l.id);
      return [l.id, progress] as const;
    });

    const progressResults = await Promise.all(progressPromises);
    lessonProgressByLesson = Object.fromEntries(
      progressResults.filter(([, p]) => p !== null)
    ) as Record<string, LessonProgress>;
  }

  // Calculate progress percentage
  const percentComplete = journeyProgress?.percentComplete || 0;

  // Calculate video duration in seconds
  const videoDurationSeconds = lesson.durationMinutes
    ? lesson.durationMinutes * 60
    : undefined;

  return (
    <ClientGuard>
      <div>
        {/* Journey title and navigation */}
        <div className="mb-8">
          <Link
            href="/classroom"
            className="text-brand hover:underline flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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

          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-3">
            {journey.title}
          </h1>

          <div className="flex items-center gap-3 mt-2">
            <span className="inline-block px-3 py-1 bg-slate-100 text-sm rounded-full text-slate-700">
              {journey.layer}
            </span>
            <span className="text-brand">{journey.emotionShift}</span>
          </div>
        </div>

        {/* Journey info card with layer description */}
        <JourneyInfoCard layer={journey.layer} />

        {/* Journey progress */}
        {journeyProgress && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Your progress</span>
              <span>{percentComplete}% complete</span>
            </div>
            <ProgressBar value={percentComplete} />
          </div>
        )}

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Lesson list */}
          <div className="order-2 lg:order-1">
            <LessonSidebar
              journeyId={journey.id}
              lessons={allLessons}
              currentLessonId={lessonId}
              lessonProgress={lessonProgressByLesson}
            />
          </div>

          {/* Right: Lesson content */}
          <div className="order-1 lg:order-2 lg:col-span-2">
            {/* Lesson header */}
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-6">
              {lesson.title}
            </h2>

            {/* Video player */}
            {lesson.contentType === "video" && lesson.videoUrl && (
              <VideoPlayer
                playbackId={lesson.videoUrl}
                title={lesson.title}
                userId={uid}
                journeyId={journey.id}
                lessonId={lessonId}
                clubId={journey.clubId}
                initialTime={lessonProgress?.lastPlaybackPosition}
                durationSeconds={videoDurationSeconds}
              />
            )}

            <div className="mt-4">
              <LessonCompletionButton
                uid={uid}
                journeyId={journey.id}
                clubId={journey.clubId}
                lessonId={lessonId}
                lessonTitle={lesson.title}
                durationSeconds={videoDurationSeconds}
                isInitiallyCompleted={lessonProgress?.isCompleted}
              />
            </div>

          </div>
        </div>
      </div>
    </ClientGuard>
  );
}
