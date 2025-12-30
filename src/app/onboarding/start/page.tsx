"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import type { OnboardingRole } from "@/types/onboarding";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const NEXT_ROUTE_BY_ROLE: Record<OnboardingRole, string> = {
  host: "/onboarding/host/club-name",
  member: "/onboarding/member/benefits",
};

function OnboardingStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, error: onboardingError } =
    useOnboardingProgress(user?.uid);
  const [submittingRole, setSubmittingRole] = useState<OnboardingRole | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const resumeRequested = searchParams?.get("resume") === "true";

  const withResumeFlag = (path: string, role: OnboardingRole) => {
    if (!resumeRequested || role !== "host") {
      return path;
    }
    return path.includes("?") ? `${path}&resume=true` : `${path}?resume=true`;
  };

  const handleSelectRole = async (role: OnboardingRole) => {
    if (submittingRole) return;
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setSubmittingRole(role);
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch("/api/onboarding/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Failed to save your choice.");
      }

      const data = await response.json();
      const nextRoute = data.nextRoute ?? NEXT_ROUTE_BY_ROLE[role];
      router.push(withResumeFlag(nextRoute, role));
    } catch (err) {
      console.error("Failed to update onboarding role", err);
      setError(
        "Something glitched while saving your choice. Please try again."
      );
      setSubmittingRole(null);
    }
  };

  const isLoading = authLoading || onboardingLoading;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-[#0f172a] text-white ${poppins.className}`}
      style={{
        background:
          "radial-gradient(circle at 20% 20%, #0f172a, #000000), radial-gradient(circle at 80% 80%, #1e293b, #0f172a)",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <style jsx global>{`
        @keyframes float1 {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(50px, 50px);
          }
        }
        @keyframes float2 {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-50px, -30px);
          }
        }
        .bg-shape {
          position: absolute;
          filter: blur(100px);
          opacity: 0.4;
          z-index: -1;
          transition: all 5s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .glass-container {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #4e8cff;
          transform: translateY(-5px);
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
        }
        .btn-primary-gradient {
          background: linear-gradient(90deg, #4e8cff, #00d2ff);
          box-shadow: 0 4px 15px rgba(0, 210, 255, 0.2);
        }
        .btn-primary-gradient:hover {
          box-shadow: 0 6px 20px rgba(0, 210, 255, 0.3);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Background Glows */}
      <div
        className="bg-shape bg-primary rounded-full w-[400px] h-[400px] top-[-10%] left-[10%]"
        style={{ animation: "float1 10s infinite alternate" }}
      />
      <div
        className="bg-shape bg-[#00d2ff] rounded-full w-[500px] h-[500px] bottom-[-10%] right-[10%]"
        style={{ animation: "float2 12s infinite alternate" }}
      />

      <div className="glass-container relative mx-auto w-[90%] max-w-[1000px] rounded-[30px] p-[40px] md:p-[60px] text-center">
        <span className="mb-[10px] block text-[0.8rem] font-semibold uppercase tracking-[3px] text-primary">
          Onboarding
        </span>

        <h1 className="mb-[50px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-3xl font-semibold text-transparent md:text-[2.5rem]">
          What feels like your next chapter here?
        </h1>

        {(error || onboardingError) && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
            {error || onboardingError}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mb-[40px] grid grid-cols-1 gap-[30px] md:grid-cols-2">
            {/* Card 1: Create a Space */}
            <div
              className="glass-card group relative flex cursor-pointer flex-col rounded-[20px] p-[40px] text-left transition-all duration-300"
              onClick={() => handleSelectRole("host")}
            >
              {/* Selection Circle */}
              <div className="absolute right-[25px] top-[25px] flex h-[24px] w-[24px] items-center justify-center rounded-full border-[2px] border-white/10 transition-all duration-300 group-hover:border-primary">
                <div className="h-[8px] w-[8px] scale-0 rounded-full bg-primary opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
              </div>

              <div className="mb-[25px] flex h-[50px] w-[50px] items-center justify-center rounded-[12px] bg-[#4e8cff]/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>

              <div className="mb-[15px] text-[1.5rem] font-semibold text-white">
                Bring a space to life
              </div>
              <div className="mb-[30px] grow text-[0.95rem] leading-[1.6] text-white/70">
                Start a small space that feels alive with your ideas. Guide
                others through technology and curiosity
              </div>

              <button
                type="button"
                disabled={submittingRole === "host"}
                className="btn-primary-gradient w-full rounded-[10px] border-none p-[14px] text-center text-[0.95rem] font-medium text-white opacity-90 transition-all duration-300 hover:opacity-100 disabled:opacity-50"
              >
                {submittingRole === "host" ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Start as a Creator"
                )}
              </button>
            </div>

            {/* Card 2: Join Spaces */}
            <div
              className="glass-card group relative flex cursor-pointer flex-col rounded-[20px] p-[40px] text-left transition-all duration-300"
              onClick={() => handleSelectRole("member")}
            >
              {/* Selection Circle */}
              <div className="absolute right-[25px] top-[25px] flex h-[24px] w-[24px] items-center justify-center rounded-full border-[2px] border-white/10 transition-all duration-300 group-hover:border-primary">
                <div className="h-[8px] w-[8px] scale-0 rounded-full bg-primary opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
              </div>

              <div className="mb-[25px] flex h-[50px] w-[50px] items-center justify-center rounded-[12px] bg-[#4e8cff]/10 text-primary">
                <Users className="h-6 w-6" />
              </div>

              <div className="mb-[15px] text-[1.5rem] font-semibold text-white">
                Discover your spaces
              </div>
              <div className="mb-[30px] grow text-[0.95rem] leading-[1.6] text-white/70">
                Explore clubs that feel aligned with your stage of growth.
              </div>

              <button
                type="button"
                disabled={submittingRole === "member"}
                className="btn-primary-gradient w-full rounded-[10px] border-none p-[14px] text-center text-[0.95rem] font-medium text-white opacity-90 transition-all duration-300 hover:opacity-100 disabled:opacity-50"
              >
                {submittingRole === "member" ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Start as a Member"
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-[20px] text-[0.9rem] text-white/70">
          You can always return, switch paths, or explore both. This is just
          where we begin together
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStartPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingStartContent />
    </Suspense>
  );
}
