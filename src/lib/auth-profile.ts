import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  type FieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
import { analytics } from "./analytics";
import type { HostStatusDoc, UserRoles } from "@/types/club";
import type { OnboardingState } from "@/types/onboarding";

type Timestampish = Timestamp | FieldValue | Date;

/**
 * User profile interface
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  googleDisplayName?: string;
  photoURL?: string;
  photoUpdatedAt?: Timestampish;
  emailVerified: boolean;
  provider: "google" | "password" | string;
  authProvider?: string;
  welcomeEmailSent?: boolean;
  roles?: UserRoles;
  hostStatus?: HostStatusDoc;
  clubsJoined?: string[];
  clubsHosted?: string[];
  preferences?: Record<string, unknown>;
  createdAt?: Timestampish;
  updatedAt?: Timestampish;
  lastLoginAt?: Timestampish;
  onboarding?: OnboardingState;
}

/**
 * Parameters for safely creating/updating a user profile document
 */
export interface UpsertUserProfileInput {
  uid: string;
  displayName: string | null;
  email: string | null;
  provider: "google" | "password" | string;
  googleDisplayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

const SIGNUP_EVENTS: Record<string, "signup_google" | "signup_email"> = {
  google: "signup_google",
  password: "signup_email",
};

/**
 * Create or update user profile on sign-in
 * Ensures user-controlled fields are only set on first login
 */
export async function upsertUserProfile(
  params: UpsertUserProfileInput,
): Promise<boolean> {
  const ref = doc(db, "users", params.uid);
  const snap = await getDoc(ref);
  const sanitizedDisplayName =
    params.displayName?.trim().length ? params.displayName.trim() : "Friend";
  const sanitizedEmail = params.email?.trim() ?? "";

  if (!snap.exists()) {
    const defaultRoles: UserRoles = {
      user: true,
      host: false,
    };
    const defaultHostStatus: HostStatusDoc = {
      enabled: false,
    };

    const profile: UserProfile = {
      uid: params.uid,
      displayName: sanitizedDisplayName,
      email: sanitizedEmail,
      emailVerified: !!params.emailVerified,
      provider: params.provider,
      authProvider: params.provider,
      roles: defaultRoles,
      hostStatus: defaultHostStatus,
      clubsJoined: [],
      clubsHosted: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      welcomeEmailSent: false,
    };

    if (params.photoURL) {
      profile.photoURL = params.photoURL;
      profile.photoUpdatedAt = serverTimestamp();
    }

    if (params.provider === "google") {
      const googleName = params.googleDisplayName?.trim();
      profile.googleDisplayName = googleName?.length
        ? googleName
        : sanitizedDisplayName;
    }

    await setDoc(ref, profile);

    const signupEvent =
      SIGNUP_EVENTS[params.provider as keyof typeof SIGNUP_EVENTS];
    if (signupEvent) {
      analytics.track(signupEvent, { userId: params.uid });
    }

    return true;
  }

  const updateData: Partial<UserProfile> = {
    email: sanitizedEmail,
    emailVerified: !!params.emailVerified,
    provider: params.provider,
    authProvider: params.provider,
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  if (params.photoURL) {
    updateData.photoURL = params.photoURL;
    updateData.photoUpdatedAt = serverTimestamp();
  }

  if (params.provider === "google") {
    const googleName = params.googleDisplayName?.trim();
    updateData.googleDisplayName = googleName?.length
      ? googleName
      : sanitizedDisplayName;
  }

  const existing = snap.data() as Partial<UserProfile>;
  if (!existing?.displayName) {
    updateData.displayName = sanitizedDisplayName;
  }

  await setDoc(ref, updateData, { merge: true });
  return false;
}
