"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const VALUES = [
  "Curiosity is sacred",
  "No shame for not knowing",
  "Small, intimate spaces first",
];

function MemberWelcomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishMemberOnboarding = async () => {
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
        body: JSON.stringify({ flow: "member" }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      router.push("/your-club");
    } catch (err) {
      console.error("Failed to finish member onboarding", err);
      setError(
        "Something glitched while wrapping up onboarding. Your progress is safe — try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
              Step 2 of 2
            </span>
            <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/10">
              <div
                className="h-full bg-[#28a745] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h1 className="mb-[15px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-[2rem] font-semibold text-transparent">
            You don&apos;t have to explore technology alone.
          </h1>

          <p className="mx-auto mb-[30px] max-w-[400px] text-[1.1rem] leading-[1.6] text-white/70">
            You just took a real step. ImagineHumans will do everything we can to ignite
            your curiosity — and gently push you toward what you can become.
          </p>

          <div className="mb-[30px] flex flex-wrap justify-center gap-[10px]">
            {VALUES.map((value) => (
              <span
                key={value}
                className="cursor-pointer select-none rounded-[25px] border border-white/10 bg-white/5 px-[16px] py-[10px] text-[0.85rem] text-white/70 transition-all duration-300 hover:-translate-y-[2px] hover:border-primary hover:bg-primary/10 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {value}
              </span>
            ))}
          </div>

          {error && (
            <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={finishMemberOnboarding}
            disabled={submitting}
            className="w-full max-w-[300px] rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] p-[15px] text-center text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Opening your spaces..." : "Find your spaces"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemberWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <MemberWelcomeContent />
    </Suspense>
  );
}
