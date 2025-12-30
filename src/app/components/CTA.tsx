"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import Link from "next/link";

// CTA component - memoized to prevent re-renders
export const CTA = React.memo(function CTA() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border bg-[#f8fafc] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              style={{ fontWeight: 700 }}
            >
              Start lighting up your map
            </h3>
            <p
              className="mt-2 text-sm text-muted-foreground max-w-prose"
              style={{ fontWeight: 400 }}
            >
              Begin with the first journey. In a few minutes you&apos;ll feel
              clearer, safer, and ready to create.
            </p>
          </div>
          <div className="flex">
            <Link href="/signin">
              <PrimaryButton className="flex items-center gap-2 px-6 py-3 !bg-[#59b8f5]">
                Enter Academy <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});
