import React from "react";
import Link from "next/link";
import { Card } from "./Card";

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export function EmptyState({
  emoji,
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center text-center p-8 md:p-12">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-slate-600">{description}</p>
      
      {ctaText && (ctaHref || onCtaClick) && (
        <div className="mt-6">
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="inline-block bg-brand text-white rounded-xl px-4 py-2"
            >
              {ctaText}
            </Link>
          ) : (
            <button
              onClick={onCtaClick}
              className="inline-block bg-brand text-white rounded-xl px-4 py-2"
            >
              {ctaText}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
