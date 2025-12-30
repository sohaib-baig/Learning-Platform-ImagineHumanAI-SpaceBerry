import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { MuxPlayer } from "@/components/MuxPlayer";
import { LessonSidebar } from "@/components/LessonSidebar";
import { getLesson } from "@/lib/db/lessons";
import { getCourseById } from "@/lib/db/courses";
import { listModulesAndLessons } from "@/lib/db/lessons";
import { getProgress } from "@/lib/db/progress";
import { analytics } from "@/lib/analytics";
import { Suspense } from "react";
import { ClientGuard } from "@/components/ClientGuard";

interface LessonPageProps {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
  searchParams: {
    t?: string; // Initial time in seconds
  };
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="aspect-video w-full bg-slate-200 rounded-xl"></div>
      <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
      <div className="h-4 bg-slate-200 rounded mb-2"></div>
      <div className="h-4 bg-slate-200 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
    </div>
  );
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const { courseId, moduleId, lessonId } = params;
  const initialTime = searchParams.t ? parseInt(searchParams.t, 10) : 0;
  
  // User authentication handled by middleware
  const userId = "user_placeholder"; // This will be replaced by server components
  
  const [course, lesson, modulesWithLessons] = await Promise.all([
    getCourseById(courseId),
    getLesson(courseId, moduleId, lessonId),
    listModulesAndLessons(courseId)
  ]);
  
  if (!course || !lesson) {
    notFound();
  }
  
  // Track lesson view
  analytics.track("view_lesson", { 
    courseId, 
    lessonId,
    moduleId 
  });
  
  // Get current lesson progress
  const currentProgress = await getProgress(userId, courseId, lessonId);
  const watchedSec = currentProgress?.watchedSec || initialTime || 0;
  
  const sidebarLessons = modulesWithLessons.flatMap((courseModule) =>
    courseModule.lessons.map((moduleLesson, position) => ({
      id: moduleLesson.id,
      title: moduleLesson.title,
      order: moduleLesson.index ?? position + 1,
      durationMinutes: moduleLesson.durationSec
        ? Math.round(moduleLesson.durationSec / 60)
        : undefined,
    }))
  );

  return (
    <ClientGuard>
      <div className="max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingState />}>
            <div className="space-y-6">
              {/* Video Player */}
              <MuxPlayer
                playbackId={lesson.muxPlaybackId}
                title={lesson.title}
                userId={userId}
                courseId={courseId}
                moduleId={moduleId}
                lessonId={lessonId}
                initialTime={watchedSec}
                durationSec={lesson.durationSec}
              />
              
              {/* Lesson Title & Content */}
              <Card>
                <h1 className="text-xl font-semibold text-slate-900 mb-4">
                  {lesson.title}
                </h1>
                
                {/* Transcript */}
                {lesson.transcriptHTML && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">
                      Transcript
                    </h2>
                    <div 
                      className="prose max-w-none text-slate-600"
                      dangerouslySetInnerHTML={{ __html: lesson.transcriptHTML }}
                    />
                  </div>
                )}
                
                {/* Resources */}
                {lesson.resources && lesson.resources.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">
                      Resources
                    </h2>
                    <ul className="space-y-2">
                      {lesson.resources.map((resource, index) => (
                        <li key={index}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline underline-offset-2"
                          >
                            {resource.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          </Suspense>
        </div>
        
        {/* Sidebar */}
        <div className="order-first lg:order-last">
          <Suspense>
            <LessonSidebar
              journeyId={courseId}
              lessons={sidebarLessons}
              currentLessonId={lessonId}
            />
          </Suspense>
        </div>
      </div>
    </div>
    </ClientGuard>
  );
}
