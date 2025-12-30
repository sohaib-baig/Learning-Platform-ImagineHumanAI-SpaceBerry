"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  type UserCredential,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { upsertUserProfile } from "./auth-profile";
import { trackEvent } from "./analytics"; // assumes analytics exports trackEvent()

export interface User extends FirebaseUser {
  isAdmin?: boolean;
}

const provider = new GoogleAuthProvider();

/** Sign in with Google (client only) */
export async function signInWithGoogle(): Promise<UserCredential> {
  const result = await signInWithPopup(auth, provider);
  const u = result.user;

  // Create/update user profile doc
  const isNewUser = await upsertUserProfile({
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL ?? undefined,
    emailVerified: u.emailVerified,
    provider: "google",
    googleDisplayName: u.displayName,
  });

  if (isNewUser) {
    try {
      const token = await u.getIdToken();
      await fetch("/api/email/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: u.uid,
          email: u.email ?? "",
          name: u.displayName ?? "Friend",
        }),
      });
    } catch (error) {
      console.error("Failed to trigger welcome email", error);
    }
  }

  // Analytics
  try {
    trackEvent?.("signin_google", { userId: u.uid });
  } catch {}

  return result;
}

/**
 * Sign up with email/password (client only)
 * NOTE: Ensure Email/Password auth is enabled in Firebase Console.
 */
export async function signUpWithEmail(params: {
  name: string;
  email: string;
  password: string;
}): Promise<UserCredential> {
  const result = await createUserWithEmailAndPassword(
    auth,
    params.email,
    params.password,
  );
  const user = result.user;

  if (params.name?.trim()) {
    await updateProfile(user, { displayName: params.name.trim() });
  }

  const isNewUser = await upsertUserProfile({
    uid: user.uid,
    displayName: params.name,
    email: user.email,
    photoURL: user.photoURL ?? undefined,
    emailVerified: user.emailVerified,
    provider: "password",
  });

  if (isNewUser) {
    try {
      const token = await user.getIdToken();
      await fetch("/api/email/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email ?? "",
          name: params.name || user.email || "Friend",
        }),
      });
    } catch (error) {
      console.error("Failed to trigger welcome email", error);
    }
  }

  trackEvent?.("signin_email", { userId: user.uid });
  return result;
}

/** Sign in with email/password */
export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}): Promise<UserCredential> {
  const result = await signInWithEmailAndPassword(auth, params.email, params.password);
  const user = result.user;

  await upsertUserProfile({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL ?? undefined,
    emailVerified: user.emailVerified,
    provider: "password",
  });

  trackEvent?.("signin_email", { userId: user.uid });
  return result;
}

/** Send reset email for password auth */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** Sign out (client only) */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Subscribe to auth changes (client only) */
export function onAuthChange(cb: (u: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}
