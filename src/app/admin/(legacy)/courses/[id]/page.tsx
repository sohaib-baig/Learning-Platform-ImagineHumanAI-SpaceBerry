"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { analytics } from "@/lib/analytics";
import { type Course, type CourseCategory } from "@/lib/db/courses";

interface CourseFormProps {
  courseId: string;
}

export default function CourseEditPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <PageHeader
        title="Edit Course"
        subtitle="Update course details and manage content"
      />
      
      <CourseForm courseId={params.id} />
    </div>
  );
}

function CourseForm({ courseId }: CourseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<CourseCategory>("Other");
  const [isPublished, setIsPublished] = useState(false);
  
  useEffect(() => {
    // Load course data
    const loadCourse = async () => {
      try {
        const docRef = doc(db, "courses", courseId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
          setCourse(courseData);
          
          // Set form fields
          setTitle(courseData.title);
          setSlug(courseData.slug);
          setSummary(courseData.summary);
          setCategory(courseData.category);
          setIsPublished(courseData.isPublished);
        } else {
          setError("Course not found");
        }
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };
    
    loadCourse();
  }, [courseId]);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    // Auto-generate slug from title
    if (!slug || slug === course?.slug) {
      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Basic validation
      if (!title) {
        setError("Title is required");
        setSaving(false);
        return;
      }
      
      if (!slug) {
        setError("Slug is required");
        setSaving(false);
        return;
      }
      
      // Update course
      const docRef = doc(db, "courses", courseId);
      await updateDoc(docRef, {
        title,
        slug,
        summary,
        category,
        isPublished,
        updatedAt: serverTimestamp(),
      });
      
      // Track if publishing
      if (isPublished && !course?.isPublished) {
        analytics.track("admin_publish_course", { courseId });
      }
      
      // Navigate back to courses list
      router.push("/admin/courses");
    } catch (err) {
      console.error("Error saving course:", err);
      setError("Failed to save course");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-10 bg-slate-200 rounded mb-4 w-full"></div>
        <div className="h-10 bg-slate-200 rounded mb-4 w-full"></div>
        <div className="h-20 bg-slate-200 rounded mb-4 w-full"></div>
        <div className="h-10 bg-slate-200 rounded mb-4 w-1/3"></div>
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
      </Card>
    );
  }
  
  if (error && !course) {
    return (
      <Card>
        <div className="text-red-500 mb-4">{error}</div>
        <PrimaryButton onClick={() => router.push("/admin/courses")}>
          Back to Courses
        </PrimaryButton>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSave}>
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="w-full"
                placeholder="Course Title"
              />
            </div>
            
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full"
                placeholder="course-slug"
              />
            </div>
            
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-slate-700 mb-1">
                Summary
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full h-20 p-3"
                placeholder="Brief description of the course"
              ></textarea>
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CourseCategory)}
                className="w-full"
              >
                <option value="AI">AI</option>
                <option value="Tech">Tech</option>
                <option value="Biz">Biz</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                id="isPublished"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/50"
              />
              <label htmlFor="isPublished" className="ml-2 text-sm font-medium text-slate-700">
                Published
              </label>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/courses")}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </PrimaryButton>
          </div>
        </form>
      </Card>
      
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Modules & Lessons
        </h2>
        <p className="text-slate-600 mb-4">
          Manage course content and structure
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => alert("Not implemented in MVP")}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
          >
            Manage Content
          </button>
        </div>
      </Card>
    </div>
  );
}
