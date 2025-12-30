import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Users } from "lucide-react";

import { WaitlistForm } from "@/components/platform/WaitlistForm";
import { CONSULTING_LINK } from "@/lib/constants";

export const metadata: Metadata = {
  title: "ImagineHumans Platform Waitlist",
  description:
    "Join the ImagineHumans waitlist to receive gentle updates and early invitations to our platform as new spaces open.",
  alternates: {
    canonical: "/platform/waitlist",
  },
};

export const runtime = "nodejs";

export default function WaitlistPage() {
  return (
    <main className="bg-white text-[#2a2257]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#eef1ff] via-white to-[#fef7ff]">
        <div className="absolute inset-0 opacity-40">
          <div className="mx-auto h-full max-w-5xl bg-[radial-gradient(circle_at_top,_#ffffff,_transparent_65%)]" />
        </div>
        <div className="relative mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-12 px-6 py-24 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-xl space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#59b8f5] transition hover:text-[#3ca3e4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.45em] text-[#ff8f5f]">
                ImagineHumans Platform
              </p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Join the waitlist for early invitations
              </h1>
              <p className="text-base text-slate-600 sm:text-lg">
                We&apos;re designing a calm home for curious builders, creators,
                and teams learning with AI. Add your name below and we&apos;ll
                let you know as soon as new spaces open.
              </p>
            </div>
            <div className="grid gap-4 rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-[0_45px_120px_-90px_rgba(20,20,40,0.45)] backdrop-blur sm:grid-cols-2">
              <Highlight
                icon={<Sparkles className="h-5 w-5" />}
                title="First looks at new journeys"
                description="Peek behind the scenes as we craft layered learning experiences."
              />
              <Highlight
                icon={<Users className="h-5 w-5" />}
                title="Founding member invitations"
                description="Receive limited invitations to the earliest community circles."
              />
            </div>
            <div>
              <Link
                href={CONSULTING_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#59b8f5] transition hover:text-[#3ca3e4]"
              >
                Prefer personal guidance?
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}

type HighlightProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function Highlight({ icon, title, description }: HighlightProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-[#2a2257]/5 bg-white/70 p-4 shadow-[0_25px_80px_-70px_rgba(20,20,40,0.45)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#59b8f5]/10 text-[#59b8f5]">
        {icon}
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[#2a2257]">{title}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
    </div>
  );
}
