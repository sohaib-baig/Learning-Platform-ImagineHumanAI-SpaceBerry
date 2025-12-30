"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getUserProfile } from "@/lib/db/users";
import type { UserProfile } from "@/lib/auth-profile";
import { onAuthChange } from "@/lib/auth-client";
import { ClientGuard } from "@/components/ClientGuard";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

function LoadingState() {
  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#212529] text-zinc-200 font-sans selection:bg-primary/30 overflow-x-hidden relative">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative z-10 min-h-screen lg:h-screen w-full px-4 py-6 md:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex animate-pulse items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-zinc-700/50" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-40 rounded bg-zinc-700/50" />
                <div className="h-4 w-56 rounded bg-zinc-700/50" />
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-zinc-800/40 p-4"
                >
                  <div className="h-4 w-24 rounded bg-zinc-700/50" />
                  <div className="h-6 w-20 rounded bg-zinc-700/50" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl p-6 shadow-2xl animate-pulse space-y-4">
                <div className="h-5 w-32 rounded bg-zinc-700/50" />
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-zinc-700/50" />
                  <div className="h-4 w-40 rounded bg-zinc-700/50" />
                  <div className="h-4 w-56 rounded bg-zinc-700/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientProfileWrapper() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setAuthUser(currentUser);
      if (currentUser) {
        try {
          const userProfile = await getUserProfile(currentUser.uid);
          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ProfileContent
      profile={profile}
      authUser={authUser}
      onProfileChange={setProfile}
    />
  );
}

function readTimestamp(value?: UserProfile["createdAt"]) {
  if (!value) return null;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as unknown as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

function ProfileContent({
  profile,
  authUser,
  onProfileChange,
}: {
  profile: UserProfile | null;
  authUser: User | null;
  onProfileChange: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}) {
  const photoUpdatedAt = useMemo(
    () => readTimestamp(profile?.photoUpdatedAt),
    [profile]
  );
  const photoSrc = useMemo(() => {
    if (!profile?.photoURL) return null;
    const cacheBuster = photoUpdatedAt?.getTime();
    if (!cacheBuster) return profile.photoURL;
    const separator = profile.photoURL.includes("?") ? "&" : "?";
    return `${profile.photoURL}${separator}t=${cacheBuster}`;
  }, [photoUpdatedAt, profile?.photoURL]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [preferences, setPreferences] = useState({
    emailReplies: !!profile?.preferences?.emailReplies,
    weeklyDigest: !!profile?.preferences?.weeklyDigest,
    journeyReminders: !!profile?.preferences?.journeyReminders,
  });
  const [savingPreference, setSavingPreference] = useState<string | null>(null);

  useEffect(() => {
    if (previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
    return;
  }, [previewUrl]);

  useEffect(() => {
    if (profile) {
      setNameInput(profile.displayName);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setPreferences({
      emailReplies: !!profile.preferences?.emailReplies,
      weeklyDigest: !!profile.preferences?.weeklyDigest,
      journeyReminders: !!profile.preferences?.journeyReminders,
    });
  }, [profile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadError(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (JPG or PNG).");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Please choose an image under 5MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
  };

  const handlePhotoUpload = async () => {
    if (!authUser) {
      setUploadError("You need to be signed in to update your profile photo.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Please choose an image to upload.");
      return;
    }

    setUploadingPhoto(true);
    setUploadError(null);

    try {
      const token = await authUser.getIdToken();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to upload photo");
      }

      const url = payload?.url as string | undefined;
      if (!url) {
        throw new Error("Upload succeeded but no URL returned");
      }

      const updatedAt = new Date();
      onProfileChange((prev) =>
        prev
          ? {
              ...prev,
              photoURL: url,
              photoUpdatedAt: updatedAt,
            }
          : prev
      );
      setShowPhotoModal(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error("Failed to upload profile photo:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "We couldn&apos;t upload your photo. Please try again."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePreferenceToggle = async (
    key: keyof typeof preferences
  ) => {
    if (!profile) return;
    const nextValue = !preferences[key];
    setSavingPreference(key);
    setPreferences((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        [`preferences.${key}`]: nextValue,
        updatedAt: serverTimestamp(),
      });
      onProfileChange((prev) =>
        prev
          ? {
              ...prev,
              preferences: {
                ...(prev.preferences ?? {}),
                [key]: nextValue,
              },
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to update preference", error);
      setPreferences((prev) => ({ ...prev, [key]: !nextValue }));
    } finally {
      setSavingPreference(null);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen lg:h-screen w-full bg-[#212529] text-zinc-200 font-sans selection:bg-primary/30 overflow-x-hidden relative">
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 min-h-screen lg:h-screen w-full px-4 py-6 md:px-6 lg:px-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <BackToHomeButton
              href="/your-clubs"
              label="Back to your clubs"
              className="text-zinc-400 hover:text-white"
            />
            <div className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl p-6 shadow-2xl">
              <div className="py-8 text-center">
                <h2 className="text-lg font-semibold text-white">
                  Profile unavailable
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  We couldn&apos;t load your account information right now. Please
                  refresh the page or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#212529] text-zinc-200 font-sans selection:bg-primary/30 overflow-x-hidden relative">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-[20%] right-[20%] w-[20%] h-[20%] bg-neutral-900/10 rounded-full blur-[80px] pointer-events-none" />
      
        <div className="relative z-10 min-h-screen lg:h-screen w-full px-4 py-6 md:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackToHomeButton href="/your-clubs" label="Back to your clubs" className="text-zinc-400 hover:text-white" />

          <section className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/40 shadow-inner">
                {photoSrc ? (
                  <Image
                    src={photoSrc}
                    alt={profile.displayName}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-zinc-400">
                    {profile.displayName.charAt(0)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!authUser}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Update photo
              </button>
            </div>

            <div className="space-y-3">
              {editingName ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={nameInput}
                      onChange={(event) => {
                        setNameInput(event.target.value);
                        setNameError(null);
                      }}
                      autoFocus
                      maxLength={64}
                      className="w-full rounded-xl border border-white/10 bg-zinc-800/40 px-3 py-2 text-base text-white placeholder:text-zinc-500 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-64"
                      placeholder="Enter your preferred name"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const nextValue = nameInput.trim();
                          if (nextValue.length === 0) {
                            setNameError("Name cannot be empty.");
                            return;
                          }
                          if (nextValue === profile.displayName) {
                            setEditingName(false);
                            return;
                          }
                          setSavingName(true);
                          setNameError(null);
                          try {
                            const userRef = doc(db, "users", profile.uid);
                            await updateDoc(userRef, {
                              displayName: nextValue,
                              updatedAt: serverTimestamp(),
                            });
                            onProfileChange((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    displayName: nextValue,
                                  }
                                : prev
                            );
                            setEditingName(false);
                          } catch (error) {
                            console.error(
                              "Failed to update display name:",
                              error
                            );
                            setNameError(
                              error instanceof Error
                                ? error.message
                                : "We couldn’t update your name. Please try again."
                            );
                          } finally {
                            setSavingName(false);
                          }
                        }}
                        disabled={savingName}
                        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingName ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setNameInput(profile.displayName);
                          setNameError(null);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-zinc-800/40 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
                        disabled={savingName}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {nameError && (
                    <p className="text-xs font-medium text-red-400">
                      {nameError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                    {profile.displayName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(true);
                      setNameInput(profile.displayName);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-300 transition hover:border-white/20 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-400"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Edit name
                  </button>
                </div>
              )}

              <p className="mt-1 text-sm text-zinc-400">{profile.email}</p>
              {profile.roles && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {profile.roles.user && (
                    <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
                      Member
                    </span>
                  )}
                  {profile.roles.host && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                      Host
                    </span>
                  )}
                  {profile.roles.admin && (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                      Admin
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                profile.emailVerified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {profile.emailVerified
                ? "Email verified"
                : "Email pending verification"}
            </span>
          </div>
        </div>
      </section>

          <div className="grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-[#272b2f]/80 backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Notifications & preferences
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Your choice
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  {
                    key: "emailReplies" as const,
                    label: "Replies to my posts",
                    description: "Email me when someone responds to my thread.",
                  },
                  {
                    key: "weeklyDigest" as const,
                    label: "Weekly digest",
                    description: "A quick recap of what happened in your clubs.",
                  },
                  {
                    key: "journeyReminders" as const,
                    label: "Journey reminders",
                    description: "Stay on track with lessons and activities.",
                  },
                ].map((pref) => (
                  <div
                    key={pref.key}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-zinc-800/40 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {pref.label}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {pref.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences[pref.key]}
                      onClick={() => handlePreferenceToggle(pref.key)}
                      disabled={savingPreference === pref.key}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                        preferences[pref.key]
                          ? "border-emerald-400 bg-emerald-500/40"
                          : "border-white/10 bg-white/10"
                      } ${
                        savingPreference === pref.key ? "opacity-60" : ""
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                          preferences[pref.key] ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close upload modal"
            className="absolute inset-0 h-full w-full bg-black/70"
            onClick={() => {
              setShowPhotoModal(false);
              setUploadError(null);
              setSelectedFile(null);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#1f2428] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Update profile photo
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Communities are built on trust and adding your face to your profile will make everyone feels safe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPhotoModal(false);
                  setUploadError(null);
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                className="rounded-full border border-white/10 bg-zinc-800/60 p-2 text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/40 shadow-inner">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Selected profile preview"
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : photoSrc ? (
                    <Image
                      src={photoSrc}
                      alt={profile.displayName}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-zinc-400">
                      {profile.displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="profile-photo"
                    className="text-sm font-medium text-white"
                  >
                    Choose a new profile image
                  </label>
                  <input
                    id="profile-photo"
                    name="profile-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-800/60 px-3 py-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-white/20"
                  />
                  <p className="text-xs text-zinc-500">
                    JPG or PNG, max 5MB. We recommend square images at least
                    400x400px.
                  </p>
                </div>
              </div>

              {uploadError && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
                  {uploadError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoModal(false);
                    setUploadError(null);
                    setSelectedFile(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white"
                  disabled={uploadingPhoto}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingPhoto ? "Uploading…" : "Upload photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ClientGuard>
      <ClientProfileWrapper />
    </ClientGuard>
  );
}
