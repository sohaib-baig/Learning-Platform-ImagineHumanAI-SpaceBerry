"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

const PROMPT_CHIPS = [
  "This space is for people who",
  "In this space, we explore",
  "If you’re curious about",
  "Our community values",
];

function HostClubNameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { onboarding, loading: onboardingLoading } = useOnboardingProgress(
    user?.uid
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumeRequested = searchParams?.get("resume") === "true";

  useEffect(() => {
    if (onboarding?.clubDraft?.name) {
      setName(onboarding.clubDraft.name);
    }
    if (onboarding?.clubDraft?.description) {
      setDescription(onboarding.clubDraft.description);
    }
  }, [onboarding?.clubDraft?.name, onboarding?.clubDraft?.description]);

  const isLoading = authLoading || onboardingLoading;

  const addPrompt = (text: string) => {
    setDescription(text);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement> | null,
    autoGenerateName = false
  ) => {
    if (event) event.preventDefault();

    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch("/api/onboarding/host/club", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: autoGenerateName ? undefined : name,
          description,
          autoGenerateName,
          step: "host:club-name", // Using this step to indicate completion of the combined step
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save details");
      }

      // Skip the old description page and go straight to select-plan
      const path = "/onboarding/host/select-plan";
      const target = resumeRequested
        ? `${path}${path.includes("?") ? "&" : "?"}resume=true`
        : path;
      router.push(target);
    } catch (err) {
      console.error("Failed to store club details", err);
      setError(
        "Something glitched while saving your space details. Your progress is safe — try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate progress: Step 1 of 3 (33%)
  const progress = 33;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,#0f172a,#000000),radial-gradient(circle_at_80%_80%,#1e293b,#0f172a)] bg-cover bg-fixed text-white font-sans selection:bg-primary/30">
      {/* Background Animated Shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] h-[400px] w-[400px] animate-float1 rounded-full bg-primary blur-[100px] opacity-40" />
        <div className="absolute -bottom-[10%] right-[10%] h-[500px] w-[500px] animate-float2 rounded-full bg-[#00d2ff] blur-[100px] opacity-40" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[600px] animate-fadeIn rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-[50px]">
          {/* Progress Bar */}
          <div className="mb-[30px] text-center">
            <span className="mb-[10px] block text-[0.9rem] text-white/70">
              Step 1 of 3
            </span>
            <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h1 className="mb-[15px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-[2rem] font-semibold text-transparent">
            Name your space
          </h1>
          <p className="mb-[30px] text-[1rem] leading-relaxed text-white/70">
            Start by naming your space and describing what it&apos;s all about
          </p>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e)}>
            <div className="mb-[25px]">
              <label
                htmlFor="space-name"
                className="mb-[10px] block text-[0.9rem] font-medium text-white"
              >
                Space Name
              </label>
              <input
                type="text"
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tech Innovators Space"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 p-[15px] text-[1rem] text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-primary focus:shadow-[0_0_15px_rgba(78,140,255,0.2)]"
              />
            </div>

            <div className="mb-[25px]">
              <label className="mb-[10px] block text-[0.9rem] font-medium text-white">
                Need a nudge?
              </label>
              <div className="flex flex-wrap gap-[10px]">
                {PROMPT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => addPrompt(chip)}
                    className="cursor-pointer select-none rounded-[25px] border border-white/10 bg-white/5 px-[16px] py-[10px] text-[0.85rem] text-white/70 transition-all duration-300 hover:-translate-y-[2px] hover:border-primary hover:bg-primary/10 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-[30px]">
              <div className="mb-[10px] flex items-center gap-2">
                <label
                  htmlFor="space-description"
                  className="text-[0.9rem] font-medium text-white"
                >
                  Description
                </label>
                <div className="group relative inline-flex">
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[0.7rem] text-white/70 transition-colors hover:border-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    aria-describedby="description-tip"
                  >
                    ?
                  </button>
                  <div
                    id="description-tip"
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0f172a]/90 p-3 text-[0.75rem] text-white shadow-xl backdrop-blur group-hover:block group-focus-within:block"
                  >
                    You’ll be able to update this later if you’d like.
                  </div>
                </div>
              </div>
              <textarea
                id="space-description"
                rows={20}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this space for, and who will it help?"
                className="w-full min-h-[60px] resize-y rounded-xl border border-white/10 bg-white/5 p-[15px] text-[1rem] text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-primary focus:shadow-[0_0_15px_rgba(78,140,255,0.2)]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] p-[15px] text-center text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Let’s continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HostClubNamePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <HostClubNameContent />
    </Suspense>
  );
}
