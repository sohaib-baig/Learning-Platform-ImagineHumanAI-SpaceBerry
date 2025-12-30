import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { listGlobalDownloads, listCourseDownloads, trackDownload } from "@/lib/db/downloads";
import { listPublishedCourses } from "@/lib/db/courses";
import { Suspense } from "react";
import { analytics } from "@/lib/analytics";
import Link from "next/link";
import { Download } from "lucide-react";
import { ClientGuard } from "@/components/ClientGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DownloadItemProps {
  id: string;
  title: string;
  description?: string;
  url: string;
}

function DownloadItem({ id, title, description, url }: DownloadItemProps) {
  const handleDownload = () => {
    trackDownload(id, title);
  };
  
  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-md font-medium text-slate-800">{title}</h3>
          {description && (
            <p className="text-sm text-slate-600 mt-1">{description}</p>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDownload}
          className="flex items-center text-brand hover:underline underline-offset-2"
        >
          <Download size={16} className="mr-1" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="animate-pulse">
      <div className="h-6 w-1/3 bg-slate-200 rounded mb-6"></div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3 border-b border-slate-100 last:border-0">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-slate-200 rounded"></div>
                <div className="h-4 w-60 bg-slate-200 rounded"></div>
              </div>
              <div className="h-8 w-24 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function DownloadsPage() {
  // Track page view
  analytics.track("view_downloads");
  
  // Get all downloads
  const globalDownloads = await listGlobalDownloads();
  
  // Get all published courses
  const courses = await listPublishedCourses();
  
  // Get course-specific downloads for each course
  const courseDownloadsPromises = courses.map(async (course) => {
    const downloads = await listCourseDownloads(course.id);
    return {
      course,
      downloads,
    };
  });
  
  const courseDownloads = await Promise.all(courseDownloadsPromises);
  const coursesWithDownloads = courseDownloads.filter(({ downloads }) => downloads.length > 0);
  
  const hasDownloads = globalDownloads.length > 0 || coursesWithDownloads.length > 0;
  
  return (
    <ClientGuard>
      <div>
        <PageHeader
          title="Downloads"
          subtitle="Access resources for your learning journey"
        />
      
      <Suspense fallback={<LoadingState />}>
        {hasDownloads ? (
          <div className="space-y-6 md:space-y-8">
            {/* Global Downloads */}
            {globalDownloads.length > 0 && (
              <Card>
                <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-4">
                  Global Resources
                </h2>
                <div className="divide-y divide-slate-100">
                  {globalDownloads.map((download) => (
                    <DownloadItem
                      key={download.id}
                      id={download.id}
                      title={download.title}
                      description={download.description}
                      url={download.url}
                    />
                  ))}
                </div>
              </Card>
            )}
            
            {/* Course Downloads */}
            {coursesWithDownloads.map(({ course, downloads }) => (
              <Card key={course.id}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {course.title} Resources
                  </h2>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="text-sm text-brand hover:underline underline-offset-2"
                  >
                    View Course
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {downloads.map((download) => (
                    <DownloadItem
                      key={download.id}
                      id={download.id}
                      title={download.title}
                      description={download.description}
                      url={download.url}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            emoji="📄"
            title="No downloads available"
            description="There are no resources available yet. Check back soon!"
            ctaText="Browse Classroom"
            ctaHref="/classroom"
          />
        )}
      </Suspense>
    </div>
    </ClientGuard>
  );
}
