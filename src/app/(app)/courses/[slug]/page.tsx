import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import Link from "next/link";
import { getCourseBySlug } from "@/lib/db/courses";
import { listModulesAndLessons } from "@/lib/db/lessons";
import { getProgress } from "@/lib/db/progress";
import { analytics } from "@/lib/analytics";
import { CheckCircle } from "lucide-react";
import Image from "next/image";
import { ClientGuard } from "@/components/ClientGuard";

interface CoursePageProps {
  params: {
    slug: string;
  };
}

type ModuleWithLessons = {
  id: string;
  title?: string;
  index?: number;
  lessons: Array<{
    id: string;
    title: string;
    index: number;
  }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = params;
  const course = await getCourseBySlug(slug);
  
  if (!course) {
    notFound();
  }
  
  // Track course view
  analytics.track("view_course", { courseId: course.id });
  
  const modulesWithLessons = await listModulesAndLessons(course.id);
  const userId: string | null = null; // User data fetched via server components
  
  // Get progress data for this course's lessons
  const progressPromises = userId
    ? modulesWithLessons.flatMap((courseModule) =>
        courseModule.lessons.map(async (lesson) => {
          const progress = await getProgress(userId, course.id, lesson.id);

          return {
            lessonId: lesson.id,
            completed: progress?.completed || false,
            watchedSec: progress?.watchedSec || 0,
          };
        })
      )
    : [];

  const progressData = userId
    ? await Promise.all(progressPromises)
    : [];
  const progressMap = progressData.reduce((acc, curr) => {
    if (!curr) return acc;
    acc[curr.lessonId] = { completed: curr.completed, watchedSec: curr.watchedSec };
    return acc;
  }, {} as Record<string, { completed: boolean; watchedSec: number }>);
  
  // Find first incomplete lesson or first lesson
  const firstLesson = modulesWithLessons[0]?.lessons[0];
  const firstModuleId = modulesWithLessons[0]?.id;
  
  let continueModuleId = firstModuleId;
  let continueLessonId = firstLesson?.id;
  let continueWatchedSec = 0;
  
  // Find the last lesson the user was watching
  for (const courseModule of modulesWithLessons) {
    for (const lesson of courseModule.lessons) {
      const progress = progressMap[lesson.id];
      
      // If there's a lesson in progress (started but not completed)
      if (progress && progress.watchedSec > 0 && !progress.completed) {
        continueModuleId = courseModule.id;
        continueLessonId = lesson.id;
        continueWatchedSec = progress.watchedSec;
      }
    }
  }
  
  // Calculate overall progress
  const totalLessons = modulesWithLessons.reduce(
    (acc, courseModule) => acc + courseModule.lessons.length,
    0
  );
  const completedLessons = Object.values(progressMap).filter((p) => p.completed).length;
  const progressPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  
  const isCourseStarted = completedLessons > 0 || Object.keys(progressMap).length > 0;
  
  return (
    <ClientGuard>
      <div>
        <PageHeader 
          title={course.title}
          subtitle={`Category: ${course.category}`}
        />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left: Course info */}
        <div className="lg:col-span-2">
          <Card>
            {course.heroImage && (
              <div className="mb-6 rounded-xl overflow-hidden">
                <Image 
                  src={course.heroImage}
                  alt={course.title}
                  width={800}
                  height={450}
                  className="w-full h-auto"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                Course Overview
              </h2>
              
              {isCourseStarted && (
                <div className="text-sm text-slate-600">
                  {progressPercentage}% complete
                </div>
              )}
            </div>
            
            <p className="text-slate-600">{course.summary}</p>
            
            {isCourseStarted && (
              <div className="mt-4">
                <div className="h-1 w-full rounded-full bg-slate-200">
                  <div 
                    className="h-1 rounded-full bg-brand"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              {continueLessonId && continueModuleId && (
                <Link href={`/learn/${course.id}/${continueModuleId}/${continueLessonId}?t=${continueWatchedSec}`}>
                  <PrimaryButton>
                    {isCourseStarted ? "Continue Learning" : "Begin Course"}
                  </PrimaryButton>
                </Link>
              )}
            </div>
          </Card>
        </div>
        
        {/* Right: Modules and lessons */}
        <div>
          <Card>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Course Content
            </h2>
            
            {modulesWithLessons.length > 0 ? (
              <div className="space-y-4">
                {modulesWithLessons.map((courseModule) => {
                  const moduleWithLessons = courseModule as ModuleWithLessons;
                  return (
                  <div key={moduleWithLessons.id}>
                    <h3 className="text-md font-medium text-slate-800 mb-2">
                      {moduleWithLessons.index}. {moduleWithLessons.title}
                    </h3>
                    
                    <ul className="space-y-1 pl-1">
                      {moduleWithLessons.lessons.map((lesson) => {
                        const progress = progressMap[lesson.id];
                        const isCompleted = progress?.completed || false;
                        
                        return (
                          <li key={lesson.id}>
                            <Link
                              href={`/learn/${course.id}/${moduleWithLessons.id}/${lesson.id}`}
                              className="flex items-center text-sm py-1 text-slate-700 hover:text-brand"
                            >
                              {isCompleted ? (
                                <CheckCircle size={16} className="mr-2 text-brand" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 mr-2"></div>
                              )}
                              <span>
                                {lesson.index}. {lesson.title}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
                })}
              </div>
            ) : (
              <p className="text-slate-600">No modules available yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
    </ClientGuard>
  );
}
