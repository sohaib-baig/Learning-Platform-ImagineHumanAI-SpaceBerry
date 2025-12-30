"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchClubBilling } from "@/lib/club";
import type { BillingAnalyticsResponse } from "@/types/analytics";
import { formatPrice } from "@/lib/stripe";
import { trackEvent } from "@/lib/analytics";

interface EarningsCardProps {
  clubId: string;
  fallbackCurrency: string;
}

export function EarningsAndGrowthCard({
  clubId,
  fallbackCurrency,
}: EarningsCardProps) {
  const [analytics, setAnalytics] = useState<BillingAnalyticsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchClubBilling(clubId)
      .then((data) => {
        if (!mounted) {
          return;
        }
        setAnalytics(data);
        if (data && !tracked.current) {
          trackEvent("view_dashboard_billing_card", { clubId });
          tracked.current = true;
        }
      })
      .catch((err: unknown) => {
        if (!mounted) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load billing metrics."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [clubId]);

  const currency = analytics?.currency ?? fallbackCurrency ?? "AUD";
  const activeSubscribers = analytics?.activeSubscribers ?? 0;
  const newSubscribers = analytics?.newSubscribers ?? 0;
  const trialConversions = analytics?.trialConversions ?? 0;
  const trialStarts = analytics?.trialStarts ?? 0;
  const cancellations = analytics?.cancellations ?? 0;
  const totalRevenueMinor = analytics?.totalRevenue ?? 0;

  // UI renders revenue in major units (divide cents by 100).
  const totalRevenueMajor = totalRevenueMinor / 100;
  const trialConversionRate =
    trialStarts > 0 ? (trialConversions / trialStarts) * 100 : 0;
  const arpm =
    activeSubscribers > 0
      ? Number((totalRevenueMajor / activeSubscribers).toFixed(2))
      : 0;
  const directPaidSignups = Math.max(newSubscribers - trialStarts, 0);
  const netGrowth = newSubscribers - cancellations;
  const netGrowthLabel = netGrowth > 0 ? `+${netGrowth}` : netGrowth.toString();
  const churnRate =
    cancellations > 0 && activeSubscribers + cancellations > 0
      ? (cancellations / (activeSubscribers + cancellations)) * 100
      : 0;
  const netGrowthValueClass =
    netGrowth > 0
      ? "text-emerald-300"
      : netGrowth < 0
        ? "text-rose-300"
        : "text-zinc-100";

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-zinc-400">
        Loading earnings & growth…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
            Earnings & Growth
          </p>
          <p className="text-4xl font-bold text-white">
            {formatPrice(totalRevenueMajor, currency)}
          </p>
          <p className="text-sm text-zinc-400">
            Monthly revenue ({currency.toUpperCase()})
          </p>
          <p className="text-xs text-zinc-500">
            Host-only insight — keep this private
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 text-xs sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-semibold text-zinc-200">
            <span className="text-zinc-400">Active members</span>
            <span className="text-white">{activeSubscribers}</span>
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold ${
              netGrowth > 0
                ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : netGrowth < 0
                  ? "border border-rose-400/40 bg-rose-500/10 text-rose-200"
                  : "border border-white/10 bg-white/5 text-zinc-200"
            }`}
          >
            Net subscriber change
            <span className="text-white">{netGrowthLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 font-semibold text-sky-200">
          New this month
          <span className="text-white">{newSubscribers}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 font-semibold text-indigo-200">
          Trial starts
          <span className="text-white">{trialStarts}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">
          Trial conversions
          <span className="text-white">{trialConversions}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 font-semibold text-fuchsia-200">
          Direct paid
          <span className="text-white">{directPaidSignups}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 font-semibold text-rose-200">
          Cancellations
          <span className="text-white">{cancellations}</span>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="New Subscribers"
          value={newSubscribers.toString()}
          description={`Trial starts this month: ${trialStarts}`}
        />
        <MetricTile
          label="Trial Conversions"
          value={trialConversions.toString()}
          description="Trials → paid"
        />
        <MetricTile
          label="Trial Conversion Rate"
          value={`${trialConversionRate.toFixed(1)}%`}
          description="Trial conversions / trial starts"
        />
        <MetricTile
          label="Direct Paid Signups"
          value={directPaidSignups.toString()}
          description="Joined without trial"
        />
        <MetricTile
          label="Net Subscribers"
          value={netGrowthLabel}
          description="New minus cancellations"
          valueClassName={netGrowthValueClass}
        />
        <MetricTile
          label="Cancellations"
          value={cancellations.toString()}
          description={`Churn approx: ${churnRate.toFixed(1)}%`}
          valueClassName="text-rose-300"
        />
        <MetricTile
          label="ARPM"
          value={formatPrice(arpm, currency)}
          description="Avg revenue / member"
        />
      </div>
    </section>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
  description: string;
  valueClassName?: string;
}

function MetricTile({
  label,
  value,
  description,
  valueClassName,
}: MetricTileProps) {
  const valueClasses = `mt-3 text-3xl font-semibold ${
    valueClassName ?? "text-white"
  }`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>
      <p className={valueClasses}>{value}</p>
      <p className="text-xs text-zinc-400">{description}</p>
    </div>
  );
}
