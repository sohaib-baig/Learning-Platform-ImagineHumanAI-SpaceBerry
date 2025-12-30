import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Course } from "@/lib/db/courses";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getAllCourses(): Promise<Course[]> {
  try {
    const coursesQuery = query(
      collection(db, "courses"),
      orderBy("updatedAt", "desc")
    );
    
    const snapshot = await getDocs(coursesQuery);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Course));
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <div className="flex justify-between mb-4">
            <div>
              <div className="h-6 w-40 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-60 bg-slate-200 rounded"></div>
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-5 w-16 rounded bg-slate-200 mr-3"></div>
              <div className="h-5 w-28 rounded bg-slate-200"></div>
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded"></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default async function AdminCourses() {
  const courses = await getAllCourses();
  
  return (
    <div>
      <PageHeader
        title="Courses Management"
        subtitle="Create and manage academy courses"
        action={
          <Link href="/admin/courses/new">
            <PrimaryButton>New Course</PrimaryButton>
          </Link>
        }
      />
      
      <Suspense fallback={<LoadingState />}>
        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course) => (
              <Link href={`/admin/courses/${course.id}`} key={course.id}>
                <Card clickable>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {course.title}
                    </h2>
                    <p className="text-slate-600 line-clamp-2">{course.summary}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full mr-2">
                        {course.category}
                      </span>
                      <span className="text-sm text-slate-500">
                        Updated: {course.updatedAt?.toDate
                          ? new Date(course.updatedAt.toDate()).toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </div>
                    
                    <span className={`
                      px-2 py-1 text-xs rounded-full
                      ${course.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                      }
                    `}>
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            emoji="📚"
            title="No courses yet"
            description="Start by creating your first course"
            ctaText="New Course"
            ctaHref="/admin/courses/new"
          />
        )}
      </Suspense>
    </div>
  );
}
