import { NextRequest } from "next/server";
import type { firestore } from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export class HostGuardError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HostGuardError";
    this.status = status;
  }
}

export interface HostContext<
  TClub = firestore.DocumentData,
  TUser = firestore.DocumentData,
> {
  uid: string;
  clubId: string;
  token: string;
  clubSnap: firestore.DocumentSnapshot<TClub>;
  clubData: TClub;
  userSnap: firestore.DocumentSnapshot<TUser>;
  userData: TUser;
}

function extractBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HostGuardError(401, "Unauthorized");
  }
  return authHeader.replace("Bearer", "").trim();
}

/**
 * Ensures the incoming request is from the host of the provided club and that
 * their host account is enabled.
 */
export async function requireEnabledHost(
  request: NextRequest,
  clubId: string
): Promise<HostContext> {
  if (!clubId) {
    throw new HostGuardError(400, "Club ID is required");
  }

  const token = extractBearerToken(request);
  const decodedToken = await adminAuth.verifyIdToken(token);
  const uid = decodedToken.uid;

  const clubRef = adminDb.collection("clubs").doc(clubId);
  const userRef = adminDb.collection("users").doc(uid);

  const [clubSnap, userSnap] = await Promise.all([
    clubRef.get(),
    userRef.get(),
  ]);

  if (!clubSnap.exists) {
    throw new HostGuardError(404, "Club not found");
  }

  if (!userSnap.exists) {
    throw new HostGuardError(403, "User record not found");
  }

  const clubData = clubSnap.data()!;
  const userData = userSnap.data()!;

  if (clubData.hostId !== uid) {
    throw new HostGuardError(403, "Forbidden");
  }

  const hostEnabled = userData.hostStatus?.enabled === true;

  if (!hostEnabled) {
    throw new HostGuardError(
      403,
      "Your host account is disabled. Contact support."
    );
  }

  return {
    uid,
    clubId,
    token,
    clubSnap,
    clubData,
    userSnap,
    userData,
  };
}
