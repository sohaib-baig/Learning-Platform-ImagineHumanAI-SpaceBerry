import "server-only";

import { adminDb } from "@/lib/firebase-admin";

export interface AdminUserCounts {
  members: number;
  admins: number;
}

/**
 * Server-only counts using Firebase Admin so security rules don't block admins.
 */
export async function getAdminUserCounts(): Promise<AdminUserCounts> {
  try {
    const [memberAgg, adminAgg] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("users").where("roles.admin", "==", true).count().get(),
    ]);

    return {
      members: memberAgg.data().count ?? 0,
      admins: adminAgg.data().count ?? 0,
    };
  } catch (error) {
    console.error("Error counting users (admin)", error);
    return { members: 0, admins: 0 };
  }
}
