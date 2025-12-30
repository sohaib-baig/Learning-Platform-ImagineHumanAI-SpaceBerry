"use client";

import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import Link from "next/link";

// Hero section with optimized animations
export const Hero = React.memo(function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Removed background gradient */}

      <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-10 lg:pt-12">
        <div className="flex flex-col items-center text-center">
          <Suspense
            fallback={
              <h1
                className="text-4xl md:text-6xl font-bold tracking-tight"
                style={{ fontWeight: 500 }}
              >
                Welcome to <span className="text-primary">ImagineHumans</span>{" "}
                Academy
              </h1>
            }
          >
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
              style={{ fontWeight: 500 }}
            >
              Welcome to <br />
              <span>
                Imagine<span style={{ color: "#59b8f5" }}>Humans</span>
              </span>{" "}
              Academy
            </motion.h1>
          </Suspense>
          <Suspense
            fallback={
              <p
                className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground"
                style={{ fontWeight: 400 }}
              >
                This isn&apos;t another course platform. It&apos;s a living
                space for curiosity — a place where learning follows your
                wonder, not a syllabus.
              </p>
            }
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground"
              style={{ fontWeight: 400 }}
            >
              This isn&apos;t another course platform. It&apos;s a living space
              for curiosity — a place where learning follows your wonder, not a
              syllabus.
            </motion.p>
          </Suspense>

          {/* Tag UI element showing joined count */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#59b8f5]/10 border border-[#59b8f5]/20 text-sm font-medium text-[#59b8f5]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#59b8f5] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#59b8f5]"></span>
            </span>
            35+ joined already
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signin">
              <PrimaryButton className="flex items-center gap-2 px-6 py-3 !bg-[#59b8f5]">
                Get Started <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </Link>
            <button className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              Watch 2‑min tour <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});
