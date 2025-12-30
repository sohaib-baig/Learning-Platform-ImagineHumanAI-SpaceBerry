"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface ChoiceCardProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onSelect: () => void;
  loading?: boolean;
  selected?: boolean;
  icon?: ReactNode;
}

export function ChoiceCard({
  title,
  subtitle,
  ctaLabel,
  onSelect,
  loading,
  selected,
  icon,
}: ChoiceCardProps) {
  return (
    <div
      className={`flex flex-col gap-6 rounded-[28px] border px-5 py-6 transition-all duration-200 bg-white/90 backdrop-blur-sm ${
        selected
          ? "border-[#59b8f5] shadow-lg shadow-[#59b8f5]/20"
          : "border-slate-200 hover:border-[#59b8f5]/80 hover:shadow-md hover:shadow-slate-200/60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="h-12 w-12 rounded-[18px] bg-[#e8f5ff] text-[#1d3b53] flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          </div>
        </div>
        <div
          className={`h-8 w-8 rounded-full border flex items-center justify-center ${
            selected
              ? "border-[#59b8f5] bg-[#59b8f5]/15 text-[#0f3a54]"
              : "border-slate-200 text-slate-300"
          }`}
        >
          {selected ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="text-lg">•</span>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">{subtitle}</p>

      <button
        type="button"
        onClick={onSelect}
        disabled={loading}
        className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold tracking-wide text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#59b8f5] bg-[#59b8f5] ${
          loading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#4aaeea]"
        }`}
      >
        {loading ? "Setting things up..." : ctaLabel}
      </button>
    </div>
  );
}
