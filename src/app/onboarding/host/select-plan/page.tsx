"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { getStripe } from "@/lib/stripe";
import {
  HOST_BILLING_TIERS,
  HOST_PLAN_DEFAULT_TIER,
  HOST_PLAN_TRIAL_DAYS,
} from "@/lib/constants";

function HostSelectPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading } = useOnboardingProgress(user?.uid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumeRequested = searchParams?.get("resume") === "true";
  const withResumeFlag = (path: string) =>
    resumeRequested
      ? `${path}${path.includes("?") ? "&" : "?"}resume=true`
      : path;

  const isLoading = authLoading || onboardingLoading;

  const planConfig = HOST_BILLING_TIERS[HOST_PLAN_DEFAULT_TIER];
  const includedMembers = planConfig.includedPayingMembers;
  const planPriceLabel = `${planConfig.monthlyPriceAud.toFixed(2)} AUD`;

  const featureCards = [
    {
      title: `${includedMembers} paying members included`,
      description:
        "Build freely, your first 100 paying members are covered. We’ll auto-upgrade when you outgrow this tie.",
    },
    {
      title: "14-day exploration trial",
      description: `Experience every hosting feature free for ${HOST_PLAN_TRIAL_DAYS}-days. Discover what it feels like to run your space with ease.`,
    },
    {
      title: "Full hosting toolkit",
      description:
        "Journeys, downloads, live sessions, messaging, and analytics — everything you need to host with confidence from day one.",
    },
  ];

  const handleCheckout = async () => {
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch("/api/onboarding/host/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start checkout");
      }

      const payload = await response.json();
      const sessionId = payload?.sessionId;
      if (!sessionId) {
        throw new Error("Missing Stripe session");
      }

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("Stripe is unavailable");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });
      if (stripeError) {
        throw stripeError;
      }
    } catch (err) {
      console.error("Failed to start host plan checkout", err);
      setError(
        "Something glitched while opening Stripe. Your progress is saved — try again in a moment."
      );
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(withResumeFlag("/onboarding/host/club-name"));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const progress = 66;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,#0f172a,#000000),radial-gradient(circle_at_80%_80%,#1e293b,#0f172a)] bg-cover bg-fixed text-white font-sans selection:bg-primary/30">
      {/* Background Animated Shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] h-[400px] w-[400px] animate-float1 rounded-full bg-primary blur-[100px] opacity-40" />
        <div className="absolute -bottom-[10%] right-[10%] h-[500px] w-[500px] animate-float2 rounded-full bg-[#00d2ff] blur-[100px] opacity-40" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[900px] animate-fadeIn rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-[50px]">
          {/* Progress Bar */}
          <div className="mb-[30px] text-center">
            <span className="mb-[10px] block text-[0.9rem] text-white/70">
              Step 2 of 3
            </span>
            <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h1 className="mb-[15px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-[2rem] font-semibold text-transparent">
            Commit to your craft
          </h1>
          {/* <p className="mb-[40px] text-[1rem] leading-relaxed text-white/70">
            Your space deserves room to grow. Start with a 14-day free trial to
            explore everything ImagineHumans offers.
            <br />
            You’ll upgrade automatically as your members grow
          </p> */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mb-[40px] grid gap-[30px] md:grid-cols-2 md:auto-rows-[1fr]">
            {/* Left Column: Pricing */}
            <div className="flex min-h-[380px] flex-col justify-between rounded-[20px] border border-white/10 bg-white/3 p-[30px] md:min-h-[440px]">
              <div>
                <div className="mb-[10px] text-[0.85rem] tracking-[2px] text-white/70">
                  The Commitment Plan
                </div>
                <div className="mb-[20px] text-[1.5rem] font-semibold text-white">
                  For creators who are serious about growth
                </div>
                <div className="mb-[20px] text-[2.2rem] font-bold text-white">
                  {planPriceLabel}{" "}
                  <span className="text-[1rem] font-normal text-white/70">
                    / month
                  </span>
                </div>

                <div className="mb-[20px] rounded-xl border border-primary/20 bg-primary/10 p-[15px] text-[0.9rem] text-blue-200">
                  {HOST_PLAN_TRIAL_DAYS}-day free trial — explore everything
                  before you commit.
                </div>
              </div>
              <div className="mt-[20px] text-[0.8rem] leading-relaxed text-white/70">
                Includes up to {includedMembers} paying members. When you grow
                beyond that, we’ll upgrade you automatically — no extra steps.
              </div>
            </div>

            {/* Right Column: Features */}
            <div className="relative flex min-h-[420px] flex-col rounded-[20px] border border-white/10 bg-white/3 p-[20px] md:min-h-[480px]">
              <div className="mb-[10px] text-[0.85rem] tracking-[2px] text-white/70">
                Everything you unlock with your trial
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="space-y-[15px] overflow-y-auto pr-2 max-h-[260px] md:max-h-[360px]">
                  {featureCards.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-[15px] border border-white/10 bg-white/3 p-[20px]"
                    >
                      <span className="mb-[5px] block font-semibold text-white">
                        {feature.title}
                      </span>
                      <span className="text-[0.9rem] leading-[1.4] text-white/70">
                        {feature.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[0.75rem] text-white/60 md:flex">
                <span>Scroll for more</span>
                <svg
                  className="h-3 w-3 animate-bounce"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-[20px] flex flex-col items-center justify-between gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto p-[15px] text-left text-[1rem] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full sm:w-auto rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] px-[40px] py-[15px] text-center text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? "Setting things up..." : "Start Building for Free"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HostSelectPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <HostSelectPlanContent />
    </Suspense>
  );
}
