import "server-only";

import { cookies, headers } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { UserRoles } from "@/types/club";

export interface AdminUser {
  uid: string;
  email?: string | null;
  roles: UserRoles;
}

export class AdminGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminGuardError";
  }
}

/**
 * Extract the Firebase token from cookies or headers.
 * Supports both long-lived session cookies and bearer tokens.
 */
function getAuthToken(): string | null {
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieToken =
    cookieStore.get("firebaseSession")?.value ||
    cookieStore.get("session")?.value ||
    cookieStore.get("__session")?.value ||
    cookieStore.get("firebaseIdToken")?.value ||
    cookieStore.get("idToken")?.value;

  const authHeader = headerStore.get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.replace(/bearer\s+/i, "").trim()
    : null;

  const customHeaderToken =
    headerStore.get("x-firebase-auth") ||
    headerStore.get("x-ih-auth-token");

  const token = cookieToken || bearerToken || customHeaderToken || null;

  console.log("[adminGuard] token source", {
    hasCookieToken: Boolean(cookieToken),
    hasBearerToken: Boolean(bearerToken),
    hasCustomHeaderToken: Boolean(customHeaderToken),
    tokenLength: token?.length ?? 0,
  });

  return token;
}

/**
 * Verify the token using the Admin SDK. We try session cookies first to allow
 * long-lived auth, then fall back to regular ID tokens.
 */
async function verifyFirebaseToken(token: string) {
  try {
    return await adminAuth.verifySessionCookie(token, true);
  } catch {
    return adminAuth.verifyIdToken(token);
  }
}

/**
 * Load the authenticated user's roles from Firestore and ensure they are admin.
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const token = getAuthToken();
  if (!token) {
    throw new AdminGuardError("Missing auth token");
  }

  const decoded = await verifyFirebaseToken(token);
  console.log("[adminGuard] decoded uid", decoded.uid);

  const hasAdminClaim = (decoded as { admin?: boolean }).admin === true;
  if (!hasAdminClaim) {
    throw new AdminGuardError("User does not have admin claim");
  }

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

  if (!userSnap.exists) {
    console.log("[adminGuard] user doc missing", decoded.uid);
    throw new AdminGuardError("User record not found");
  }

  const userData = userSnap.data() as { roles?: UserRoles; email?: string | null };
  const roles: UserRoles = {
    user: true,
    host: userData.roles?.host ?? false,
    admin: true, // enforced by custom claim above
  };
  const email = userData.email ?? decoded.email ?? null;

  console.log("[adminGuard] roles", roles);

  return {
    uid: decoded.uid,
    email,
    roles,
  };
}
