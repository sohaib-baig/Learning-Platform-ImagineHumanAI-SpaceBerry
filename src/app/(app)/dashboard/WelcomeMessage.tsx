"use client";

import { useEffect, useState } from "react";
import { onAuthChange } from "@/lib/auth-client";
import { getUserProfile } from "@/lib/db/users";
import type { UserProfile } from "@/lib/auth-profile";

/**
 * Capitalize the first letter of each word in a name
 */
function capitalizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function WelcomeMessage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
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
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const rawDisplayName = profile?.displayName || "there";
  const displayName = capitalizeName(rawDisplayName);

  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
        Welcome back, {displayName}!
      </h1>
    </div>
  );
}

