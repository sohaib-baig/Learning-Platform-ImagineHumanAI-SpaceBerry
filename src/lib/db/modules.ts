import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Module interface
 */
export interface Module {
  id: string;
  title: string;
  index: number;
}

/**
 * List all modules for a course
 */
export async function listModules(courseId: string): Promise<Module[]> {
  try {
    const modulesQuery = query(
      collection(db, `courses/${courseId}/modules`),
      orderBy("index", "asc")
    );
    
    const snapshot = await getDocs(modulesQuery);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Module));
  } catch (error) {
    console.error(`Error fetching modules for course ${courseId}:`, error);
    return [];
  }
}

/**
 * Get the first module for a course
 */
export async function getFirstModule(courseId: string): Promise<Module | null> {
  try {
    const modules = await listModules(courseId);
    return modules.length > 0 ? modules[0] : null;
  } catch (error) {
    console.error(`Error fetching first module for course ${courseId}:`, error);
    return null;
  }
}
