import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { UserProfile } from "../auth-profile";

/**
 * Get a user profile by uid
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docSnap.data() as UserProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Get counts of members and admins
 */
export async function getCounts(): Promise<{ members: number; admins: number }> {
  try {
    // Count total members
    const membersQuery = query(collection(db, "users"));
    const membersSnapshot = await getDocs(membersQuery);
    const membersCount = membersSnapshot.size;
    
    // Count admins
    const adminsQuery = query(
      collection(db, "users"), 
      where("roles.admin", "==", true)
    );
    const adminsSnapshot = await getDocs(adminsQuery);
    const adminsCount = adminsSnapshot.size;
    
    return {
      members: membersCount,
      admins: adminsCount,
    };
  } catch (error) {
    console.error("Error fetching user counts:", error);
    return { members: 0, admins: 0 };
  }
}
