"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";

const BENEFITS = [
  {
    title: "Feel confident, not behind.",
    description:
      "Get clarity on the tools that actually matter for your life, work, and creativity.",
  },
  {
    title: "Try technology in a safe, small way.",
    description:
      "Ask real questions, see real demos, and learn by doing — without judgement.",
  },
  {
    title: "Find your kind of humans.",
    description:
      "Join clubs hosted by people who share your values, your pace, and your way of learning.",
  },
  {
    title: "Find your kind of humans.",
    description:
      "Join clubs hosted by people who share your values, your pace, and your way of learning.",
  },
];

function MemberBenefitsContent() {
  const router = useRouter();

  const progress = 50;

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
              Step 1 of 2
            </span>
            <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h1 className="mb-[15px] bg-gradient-to-r from-white to-[#b4c6e7] bg-clip-text text-[2rem] font-semibold text-transparent">
            Join spaces that make technology feel human again.
          </h1>
          <p className="mb-[40px] text-[1rem] leading-relaxed text-white/70">
            Learn, explore, and experiment with technology and AI in communities built for
            real humans — not just tech experts.
          </p>

          <div className="mb-[40px] grid gap-[30px] md:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-[15px] border border-white/10 bg-white/3 p-[20px]"
              >
                <span className="mb-[5px] block font-semibold text-white">
                  {benefit.title}
                </span>
                <span className="text-[0.9rem] leading-[1.4] text-white/70">
                  {benefit.description}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/onboarding/member/welcome")}
              className="rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] px-[40px] py-[15px] text-center text-[1rem] font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.3)]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MemberBenefitsPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <MemberBenefitsContent />
    </Suspense>
  );
}



