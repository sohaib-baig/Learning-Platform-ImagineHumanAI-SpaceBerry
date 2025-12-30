import { collection, getDocs, orderBy, query, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lesson interface
 */
export interface Lesson {
  id: string;
  title: string;
  index: number;
  muxPlaybackId: string;
  durationSec?: number;
  transcriptHTML?: string;
  resources?: Array<{ label: string; url: string }>;
  isFreePreview?: boolean;
}

/**
 * List all lessons for a module
 */
export async function listLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  try {
    const lessonsQuery = query(
      collection(db, `courses/${courseId}/modules/${moduleId}/lessons`),
      orderBy("index", "asc")
    );
    
    const snapshot = await getDocs(lessonsQuery);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Lesson));
  } catch (error) {
    console.error(`Error fetching lessons for module ${moduleId}:`, error);
    return [];
  }
}

/**
 * Get a specific lesson
 */
export async function getLesson(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Lesson | null> {
  try {
    const lessonRef = doc(
      db,
      `courses/${courseId}/modules/${moduleId}/lessons`,
      lessonId
    );
    
    const lessonSnap = await getDoc(lessonRef);
    
    if (!lessonSnap.exists()) {
      return null;
    }
    
    return {
      id: lessonSnap.id,
      ...lessonSnap.data(),
    } as Lesson;
  } catch (error) {
    console.error(`Error fetching lesson ${lessonId}:`, error);
    return null;
  }
}

/**
 * List all modules and their lessons for a course
 */
export async function listModulesAndLessons(courseId: string) {
  try {
    const modulesQuery = query(
      collection(db, `courses/${courseId}/modules`),
      orderBy("index", "asc")
    );
    
    const modulesSnapshot = await getDocs(modulesQuery);
    
    const modulesWithLessons = await Promise.all(
      modulesSnapshot.docs.map(async (moduleDoc) => {
        const moduleId = moduleDoc.id;
        const moduleData = moduleDoc.data();
        
        const lessonsQuery = query(
          collection(db, `courses/${courseId}/modules/${moduleId}/lessons`),
          orderBy("index", "asc")
        );
        
        const lessonsSnapshot = await getDocs(lessonsQuery);
        
        const lessons = lessonsSnapshot.docs.map((lessonDoc) => ({
          id: lessonDoc.id,
          ...lessonDoc.data(),
        } as Lesson));
        
        return {
          id: moduleId,
          ...moduleData,
          lessons,
        };
      })
    );
    
    return modulesWithLessons;
  } catch (error) {
    console.error(`Error fetching modules and lessons for course ${courseId}:`, error);
    return [];
  }
}

/**
 * Get the first lesson for a course
 */
export async function getFirstLesson(
  courseId: string
): Promise<{ moduleId: string; lessonId: string } | null> {
  try {
    const modulesWithLessons = await listModulesAndLessons(courseId);
    
    if (modulesWithLessons.length === 0) {
      return null;
    }
    
    const firstModule = modulesWithLessons[0];
    
    if (!firstModule.lessons || firstModule.lessons.length === 0) {
      return null;
    }
    
    const firstLesson = firstModule.lessons[0];
    
    return {
      moduleId: firstModule.id,
      lessonId: firstLesson.id,
    };
  } catch (error) {
    console.error(`Error fetching first lesson for course ${courseId}:`, error);
    return null;
  }
}
