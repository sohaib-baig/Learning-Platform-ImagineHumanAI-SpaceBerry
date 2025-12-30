import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Course type definitions
 */
export type CourseCategory = "AI" | "Tech" | "Biz" | "Other";

export interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: CourseCategory;
  heroImage?: string;
  isPublished: boolean;
  createdBy: string;
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

/**
 * List all published courses
 */
export async function listPublishedCourses(
  category?: CourseCategory
): Promise<Course[]> {
  try {
    let coursesQuery;
    
    if (category) {
      coursesQuery = query(
        collection(db, "courses"),
        where("isPublished", "==", true),
        where("category", "==", category),
        orderBy("updatedAt", "desc")
      );
    } else {
      coursesQuery = query(
        collection(db, "courses"),
        where("isPublished", "==", true),
        orderBy("updatedAt", "desc")
      );
    }
    
    const snapshot = await getDocs(coursesQuery);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Course));
  } catch (error) {
    console.error("Error fetching published courses:", error);
    return [];
  }
}

/**
 * Get a course by slug
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const coursesQuery = query(
      collection(db, "courses"),
      where("slug", "==", slug),
      where("isPublished", "==", true)
    );
    
    const snapshot = await getDocs(coursesQuery);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Course;
  } catch (error) {
    console.error("Error fetching course by slug:", error);
    return null;
  }
}

/**
 * Get a course by ID
 */
export async function getCourseById(id: string): Promise<Course | null> {
  try {
    const docRef = doc(db, "courses", id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Course;
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    return null;
  }
}
