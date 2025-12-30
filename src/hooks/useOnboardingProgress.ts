"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OnboardingState } from "@/types/onboarding";

interface UseOnboardingProgressResult {
  onboarding: OnboardingState | null;
  loading: boolean;
  error: string | null;
}

export function useOnboardingProgress(uid?: string | null): UseOnboardingProgressResult {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setOnboarding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.data() as (DocumentData & { onboarding?: OnboardingState }) | undefined;
        setOnboarding(data?.onboarding ?? null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load onboarding state", err);
        setError("Unable to load onboarding progress.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return useMemo(
    () => ({
      onboarding,
      loading,
      error,
    }),
    [onboarding, loading, error]
  );
}

