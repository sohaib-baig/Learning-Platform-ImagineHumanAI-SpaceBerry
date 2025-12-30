import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { analytics } from "../analytics";

/**
 * Download interface
 */
export interface Download {
  id: string;
  title: string;
  description?: string;
  url: string;
  courseId?: string;
  createdBy: string;
  createdAt: Timestamp; // Firestore Timestamp
}

/**
 * List global downloads (not associated with a specific course)
 */
export async function listGlobalDownloads(): Promise<Download[]> {
  try {
    const downloadsQuery = query(
      collection(db, "downloads"),
      where("courseId", "==", null),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(downloadsQuery);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Download)
    );
  } catch (error) {
    console.error("Error fetching global downloads:", error);
    return [];
  }
}

/**
 * List downloads for a specific course
 */
export async function listCourseDownloads(
  courseId: string
): Promise<Download[]> {
  try {
    const downloadsQuery = query(
      collection(db, "downloads"),
      where("courseId", "==", courseId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(downloadsQuery);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Download)
    );
  } catch (error) {
    console.error(`Error fetching downloads for course ${courseId}:`, error);
    return [];
  }
}

/**
 * Track download event
 */
export function trackDownload(downloadId: string, title: string): void {
  analytics.track("download_resource", { resourceId: downloadId, title });
}
