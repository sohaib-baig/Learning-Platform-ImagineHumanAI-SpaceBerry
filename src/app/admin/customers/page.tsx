"use client";

import { useCallback, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/auth-profile";
import { UserDetailCard } from "./UserDetailCard";

type PaymentRow = {
  id: string;
  clubId?: string;
  type?: string;
  amountCents: number;
  platformFeeCents: number;
  createdAt?: Date;
};

type BillingRow = {
  id: string;
  eventType?: string;
  status?: string;
  createdAt?: Date;
};

function toDate(value: unknown): Date | undefined {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function formatDate(value?: Date) {
  if (!value) return "—";
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function centsToDollars(value: number) {
  return value / 100;
}

export default function AdminCustomersPage() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedPayments = useMemo(
    () =>
      [...payments].sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [payments]
  );

  const sortedBilling = useMemo(
    () =>
      [...billingEvents].sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [billingEvents]
  );

  // Fetch payments for user
  const fetchPayments = useCallback(async (uid: string) => {
    setLoadingPayments(true);
    setPayments([]);
    try {
      const paymentsRef = collection(db, "payments");
      const snap = await getDocs(
        query(paymentsRef, where("uid", "==", uid))
      );
      const rows: PaymentRow[] = snap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          clubId: typeof data.clubId === "string" ? data.clubId : undefined,
          type: typeof data.type === "string" ? data.type : undefined,
          amountCents: typeof data.amount === "number" ? data.amount : 0,
          platformFeeCents:
            typeof data.platformFeeAmount === "number"
              ? data.platformFeeAmount
              : 0,
          createdAt: toDate(data.createdAt),
        };
      });
      setPayments(rows);
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Fetch billing events for user
  const fetchBillingEvents = useCallback(async (uid: string) => {
    setLoadingBilling(true);
    setBillingEvents([]);
    try {
      const billingRef = collection(db, "billingEvents");
      const snap = await getDocs(
        query(billingRef, where("uid", "==", uid))
      );
      const rows: BillingRow[] = snap.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          eventType:
            typeof data.eventType === "string" ? data.eventType : undefined,
          status: typeof data.status === "string" ? data.status : undefined,
          createdAt: toDate(data.createdAt),
        };
      });
      setBillingEvents(rows);
    } catch (err) {
      console.error("Failed to load billing events", err);
    } finally {
      setLoadingBilling(false);
    }
  }, []);

  // Search user by email
  const handleSearch = useCallback(async () => {
    setError(null);
    setSearching(true);
    setProfile(null);
    setPayments([]);
    setBillingEvents([]);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Enter an email to search.");
        return;
      }

      const usersRef = collection(db, "users");
      const userSnap = await getDocs(
        query(usersRef, where("email", "==", normalizedEmail))
      );

      if (userSnap.empty) {
        setError("No user found for that email.");
        return;
      }

      const docSnap = userSnap.docs[0];
      const data = docSnap.data() as UserProfile;
      setProfile(data);

      // Fetch related data
      await Promise.all([
        fetchPayments(docSnap.id),
        fetchBillingEvents(docSnap.id),
      ]);
    } catch (err) {
      console.error("Failed to search user", err);
      setError("Unable to search right now. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [email, fetchBillingEvents, fetchPayments]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">
              User email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-amber-700">{error}</p>
        )}
      </section>

      {profile && <UserDetailCard profile={profile} />}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-500">
            {payments.length ? `${payments.length} record(s)` : ""}
          </p>
        </div>
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              if (payments.length === 0 && billingEvents.length === 0) return;
              const headers = [
                "recordType",
                "id",
                "date",
                "clubId",
                "type_or_event",
                "amount",
                "platformFee",
                "status",
              ];
              const paymentRows = payments.map((p) => [
                "payment",
                p.id,
                p.createdAt?.toISOString() ?? "",
                p.clubId ?? "",
                p.type ?? "",
                centsToDollars(p.amountCents).toFixed(2),
                centsToDollars(p.platformFeeCents).toFixed(2),
                "",
              ]);
              const billingRows = billingEvents.map((b) => [
                "billingEvent",
                b.id,
                b.createdAt?.toISOString() ?? "",
                "",
                b.eventType ?? "",
                "",
                "",
                b.status ?? "",
              ]);
              const csvContent = [headers, ...paymentRows, ...billingRows]
                .map((row) =>
                  row
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
              link.download = `customer-${profile?.email ?? "export"}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            disabled={payments.length === 0 && billingEvents.length === 0}
            className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
        {loadingPayments ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading payments…
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Club ID</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedPayments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.clubId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      ${centsToDollars(row.amountCents).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      ${centsToDollars(row.platformFeeCents).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Host billing events
          </h2>
          <p className="text-sm text-slate-500">
            {billingEvents.length ? `${billingEvents.length} record(s)` : ""}
          </p>
        </div>
        {loadingBilling ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading billing events…
          </div>
        ) : billingEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No billing events found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Billing ID</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedBilling.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.eventType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.status ?? "—"}
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
