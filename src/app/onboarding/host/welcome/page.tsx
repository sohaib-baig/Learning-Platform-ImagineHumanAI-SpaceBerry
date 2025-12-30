"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import confetti from "canvas-confetti";
import excitedGif from "@/assets/Excited.gif";

function HostWelcomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { onboarding } = useOnboardingProgress(user?.uid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = onboarding?.clubDraft?.slug;
  const clubId = onboarding?.clubDraft?.clubId;

  const targetPath = slug
    ? `/club/${slug}/dashboard`
    : clubId
      ? `/club/${clubId}/dashboard`
      : "/your-clubs";

  const completeOnboarding = async () => {
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flow: "host" }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark onboarding complete");
      }

      router.push(targetPath);
    } catch (err) {
      console.error("Failed to finish onboarding", err);
      setError(
        "Something glitched while wrapping up onboarding. Your progress is safe — try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.4 },
      ticks: 200,
      colors: ["#4e8cff", "#00d2ff", "#ffffff"],
    });
  }, []);

  const progress = 100;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,#0f172a,#000000),radial-gradient(circle_at_80%_80%,#1e293b,#0f172a)] bg-cover bg-fixed text-white font-sans selection:bg-primary/30">
      {/* Background Animated Shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] h-[400px] w-[400px] animate-float1 rounded-full bg-primary blur-[100px] opacity-40" />
        <div className="absolute -bottom-[10%] right-[10%] h-[500px] w-[500px] animate-float2 rounded-full bg-[#00d2ff] blur-[100px] opacity-40" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[600px] animate-fadeIn rounded-[30px] border border-white/10 bg-white/5 p-[60px_50px] text-center backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          {/* Progress Bar */}
          <div className="mb-[30px] text-center">
            <span className="mb-[10px] block text-[0.9rem] text-white/70">
              Step 3 of 3
            </span>
            <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/10">
              <div
                className="h-full bg-[#28a745] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Avatar Circle with GIF */}
          <div className="mx-auto mb-[30px] flex h-[100px] w-[100px] items-center justify-center rounded-full border-[4px] border-white/10 bg-gradient-to-br from-primary to-[#00d2ff] shadow-[0_10px_30px_rgba(0,210,255,0.3)]">
            <Image
              src={excitedGif}
              alt="Animated hands clapping"
              width={excitedGif.width}
              height={excitedGif.height}
              priority={false}
              className="h-24 w-24 rounded-full border border-white/60 bg-white object-cover shadow-lg shadow-slate-200/80"
            />
          </div>

          <span className="mb-[15px] block text-[0.8rem] font-bold uppercase tracking-[3px] text-primary">
            Well done
          </span>

          <h1 className="mb-[15px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-[2rem] font-semibold text-transparent">
            Your new space is live!
          </h1>

          <p className="mx-auto mb-[40px] max-w-[400px] text-[1.1rem] leading-[1.6] text-white/70">
            You’ve built a place for curious humans to explore and grow
            together. Take a moment to appreciate what you’ve started.
          </p>

          {error && (
            <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={completeOnboarding}
            disabled={submitting}
            className="w-full max-w-[300px] rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] p-[15px] text-center text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Opening your space..." : "Go to My Space"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <HostWelcomeContent />
    </Suspense>
  );
}
