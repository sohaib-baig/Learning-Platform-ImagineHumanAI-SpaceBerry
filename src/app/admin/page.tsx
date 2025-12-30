import { Card } from "@/components/Card";
import { adminDb } from "@/lib/firebase-admin";
import type { firestore } from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

type BillingEventDoc = {
  eventType?: string;
  createdAt?: firestore.Timestamp;
};

type PaymentDoc = {
  clubId?: string;
  amount?: number;
  platformFeeAmount?: number;
  createdAt?: firestore.Timestamp;
};

function formatMoney(cents?: number) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function formatDate(value?: Date) {
  if (!value) return "—";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Date window: current month to now for quick executive view.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTs = Timestamp.fromDate(startOfMonth);
  const endTs = Timestamp.fromDate(now);

  // ---- Fetch billing events (host plans) for current month ----
  const billingSnap = await adminDb
    .collection("billingEvents")
    .where("createdAt", ">=", startTs)
    .where("createdAt", "<=", endTs)
    .get();

  let activePlans = 0;
  let hostTrials = 0;
  let billingRevenueCents = 0;

  billingSnap.forEach((doc) => {
    const data = doc.data() as BillingEventDoc;
    const eventType = data.eventType ?? "";
    const amountCents =
      typeof (doc.data() as Record<string, unknown>).amountCents === "number"
        ? ((doc.data() as Record<string, unknown>).amountCents as number)
        : 0;
    const phase =
      typeof (doc.data() as Record<string, unknown>).phase === "string"
        ? ((doc.data() as Record<string, unknown>).phase as string)
        : "";

    if (eventType === "host_plan_subscription_updated") {
      activePlans += 1;
    }
    if (eventType === "host_plan_trial_started") {
      hostTrials += 1;
    }
    if (phase !== "trial" && amountCents > 0) {
      billingRevenueCents += amountCents;
    }
  });

  // ---- Fetch payments for current month (platform fee + latest rows) ----
  const paymentsSnap = await adminDb
    .collection("payments")
    .where("createdAt", ">=", startTs)
    .where("createdAt", "<=", endTs)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  let platformFeesCents = 0;
  const recentPayments = paymentsSnap.docs.map((doc) => {
    const data = doc.data() as PaymentDoc;
    const createdAt = data.createdAt?.toDate?.() ?? null;
    const platformFee = typeof data.platformFeeAmount === "number" ? data.platformFeeAmount : 0;
    platformFeesCents += platformFee;
    const typeValue =
      typeof (doc.data() as Record<string, unknown>).type === "string"
        ? ((doc.data() as Record<string, unknown>).type as string)
        : "—";
    return {
      id: doc.id,
      clubId: data.clubId ?? "—",
      amount: typeof data.amount === "number" ? data.amount : 0,
      platformFee,
      createdAt,
      type: typeValue,
    };
  });

  const platformRevenueTotal = platformFeesCents + billingRevenueCents;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Overview
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          ImagineHumans Admin
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Current-month platform performance at a glance.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active host plans (month)
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {activePlans.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Host trials started (month)
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {hostTrials.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Platform revenue (month)
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatMoney(platformRevenueTotal)}
          </p>
        </Card>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent platform transactions (month to date)
          </h2>
          <p className="text-sm text-slate-500">
            {recentPayments.length ? `${recentPayments.length} shown` : "No records"}
          </p>
        </div>
        {recentPayments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No platform transactions for the current month.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">Club</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentPayments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">
                      {formatDate(row.createdAt ?? undefined)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 break-all">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.clubId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.type}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatMoney(row.platformFee)}
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
