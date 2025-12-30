"use client";

import type { ReactNode } from "react";

type UpgradeGateProps = {
  onUpgrade: () => void | Promise<void>;
  onClose: () => void;
  title?: ReactNode;
};

export function UpgradeGate({
  onUpgrade,
  title = "Join to unlock every lesson.",
}: UpgradeGateProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-xl">
      <div className="flex flex-col gap-6">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Go further on your journey
          </p>
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            We limit trial access to respect the energy and care our creators
            pour in.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Unlock full access
          </button>
        </div>
      </div>
    </div>
  );
}
