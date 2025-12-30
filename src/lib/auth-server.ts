// Server-only helpers (no 'use client' and do NOT import this from client components)
// Example stubs for future Admin SDK usage. Safe to leave minimal for MVP.
import { auth } from "./firebase";

export type ServerUser = {
  uid: string;
  isAdmin?: boolean;
};

export function isAdminServer(user: ServerUser | null) {
  return !!user?.isAdmin;
}

/**
 * Get the current user session (server-side only)
 */
export async function getServerSession() {
  try {
    // Get the current user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return null;
    }

    return {
      user: {
        uid: currentUser.uid,
        // Add more user properties as needed
      },
    };
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}
