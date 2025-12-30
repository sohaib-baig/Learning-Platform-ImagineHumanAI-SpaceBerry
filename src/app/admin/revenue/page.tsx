"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RevenueStats } from "./RevenueStats";

type Stats = {
  activePlans: number;
  hostTrials: number;
  platformRevenue: number; // in dollars
};

type RevenueRow = {
  id: string; // paymentId or billing event id
  date: Date;
  amountCents: number;
  source: "payment_fee" | "host_subscription";
  clubId?: string;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function centsToDollars(value: number) {
  return value / 100;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminRevenuePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState<Stats>({
    activePlans: 0,
    hostTrials: 0,
    platformRevenue: 0,
  });
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize default range to current month.
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(formatDateInput(start));
    setDateTo(formatDateInput(now));
  }, []);

  // Fetch billing and payments stats for the selected range.
  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    setLoading(true);
    setError(null);

    try {
      const start = startOfDay(new Date(dateFrom));
      const end = endOfDay(new Date(dateTo));
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      // Billing events: single query to derive counts and platform revenue from new fields.
      // Platform revenue from payments collection
      const billingRef = collection(db, "billingEvents");
      const paymentsRef = collection(db, "payments");
      const billingSnap = await getDocs(
        query(
          billingRef,
          where("createdAt", ">=", startTs),
          where("createdAt", "<=", endTs)
        )
      );

      const paymentsSnap = await getDocs(
        query(
          paymentsRef,
          where("createdAt", ">=", startTs),
          where("createdAt", "<=", endTs)
        )
      );

      let hostTrials = 0;
      let activePlans = 0;
      let billingEventRevenueCents = 0;
      const billingRows: RevenueRow[] = [];
      // Platform revenue components
      let platformRevenueCents = 0; // from payments.platformFeeAmount
      const paymentRows: RevenueRow[] = [];

      billingSnap.forEach((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const eventType =
          typeof data.eventType === "string" ? data.eventType : "";
        const phase = typeof data.phase === "string" ? data.phase : "";
        const amountCents = toNumber(data.amountCents, 0);
        const created =
          (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
          new Date();
        const clubId = typeof data.clubId === "string" ? data.clubId : undefined;

        if (eventType === "host_plan_trial_started") {
          hostTrials += 1;
        }

        if (eventType === "host_plan_subscription_updated") {
          activePlans += 1;
        }

        // Add platform revenue from non-trial billing events with a positive amount.
        if (phase !== "trial" && amountCents > 0) {
          billingEventRevenueCents += amountCents;
          billingRows.push({
            id: doc.id,
            date: created,
            amountCents,
            source: "host_subscription",
            clubId,
          });
        }
      });

      paymentsSnap.forEach((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const fee = toNumber(data.platformFeeAmount, 0);
        platformRevenueCents += fee;
        const created =
          (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
          new Date();
        const clubId = typeof data.clubId === "string" ? data.clubId : undefined;

        paymentRows.push({
          id: doc.id,
          date: created,
          amountCents: fee,
          source: "payment_fee",
          clubId,
        });
      });

      // Total platform revenue = billingEvents.amountCents (non-trial) + payments.platformFeeAmount
      const totalPlatformRevenueCents =
        platformRevenueCents + billingEventRevenueCents;
      const mergedRows = [...billingRows, ...paymentRows].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      setRows(mergedRows);
      setStats({
        activePlans,
        hostTrials,
        platformRevenue: centsToDollars(totalPlatformRevenueCents),
      });
    } catch (err) {
      console.error("Failed to load revenue data", err);
      setError("Unable to load revenue data right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Re-query when date range changes.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Revenue
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Platform performance
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-amber-700">{error}</p>
        )}
      </section>

      <RevenueStats
        loading={loading}
        stats={[
          {
            label: "Active Host Plans",
            value: stats.activePlans.toLocaleString(),
          },
          {
            label: "Host Trials Started",
            value: stats.hostTrials.toLocaleString(),
          },
          {
            label: "Platform Revenue",
            value: `$${stats.platformRevenue.toFixed(2)}`,
          },
        ]}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Platform revenue sources
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Transactions contributing to revenue
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (rows.length === 0) return;
              const headers = ["id", "date", "source", "amount", "clubId"];
              const csvRows = rows.map((row) => [
                row.id,
                row.date.toISOString(),
                row.source,
                centsToDollars(row.amountCents).toFixed(2),
                row.clubId ?? "",
              ]);
              const csvContent = [headers, ...csvRows]
                .map((r) =>
                  r
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(",")
                )
                .join("\n");
              const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `platform-revenue-${dateFrom}-to-${dateTo}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            disabled={rows.length === 0}
            className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading transactions…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No eligible transactions in this range.
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">Club ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">
                      {row.date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.source === "host_subscription"
                        ? "Host subscription"
                        : "Payment fee"}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      ${centsToDollars(row.amountCents).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-slate-700">
                        <span className="font-mono text-xs break-all">
                          {row.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(row.id)}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {row.clubId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
