"use client";

import Link from "next/link";

interface BackToHomeButtonProps {
  label?: string;
  className?: string;
  clubSlug?: string;
  href?: string;
}

export function BackToHomeButton({
  label = "Back to home",
  className = "",
  clubSlug,
  href,
}: BackToHomeButtonProps) {
  const targetHref = clubSlug
    ? `/club/${clubSlug}/dashboard`
    : (href ?? "/your-clubs");

  return (
    <Link
      href={targetHref}
      className={`inline-flex items-center gap-2 text-sm font-medium transition ${className || "text-slate-600 hover:text-slate-900"}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm ${
        className?.includes("text-zinc") 
          ? "border-white/10 bg-[#212529]/60 text-zinc-400 hover:bg-white/[0.05] hover:border-white/20"
          : "border-slate-200 bg-white text-slate-500"
      }`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
