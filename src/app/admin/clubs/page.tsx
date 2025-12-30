"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ClubRevenueCard } from "./ClubRevenueCard";

type ClubRow = {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  billingTier?: string;
  planType?: string;
  membersCount?: number;
  memberCost?: number;
};

type Payment = {
  id: string;
  amount: number;
  hostAmount?: number;
  platformFeeAmount?: number;
  createdAt?: Date;
  type?: string;
  uid?: string;
};

function formatDate(value?: Date) {
  if (!value) return "—";
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function centsToDollars(value?: number) {
  if (typeof value !== "number") return 0;
  return value / 100;
}

function formatDateTime(value?: Date) {
  if (!value) return "—";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

export default function AdminClubsPage() {
  const [email, setEmail] = useState("");
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredPayments = useMemo(() => {
    if (!payments.length) return [];
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    const filtered = payments.filter((payment) => {
      if (!payment.createdAt) return false;
      if (start && payment.createdAt < start) return false;
      if (end && payment.createdAt > end) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return sortDirection === "asc"
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [payments, dateFrom, dateTo, sortDirection]);

  // Export filtered payments to CSV for the selected club/date range.
  const exportPaymentsCsv = () => {
    if (!selectedClubId || filteredPayments.length === 0) return;

    const headers = [
      "paymentId",
      "date",
      "amount",
      "hostAmount",
      "platformFeeAmount",
      "type",
      "uid",
      "clubId",
    ];
    const rows = filteredPayments.map((p) => [
      p.id,
      p.createdAt?.toISOString() ?? "",
      centsToDollars(p.amount).toFixed(2),
      centsToDollars(p.hostAmount ?? 0).toFixed(2),
      centsToDollars(p.platformFeeAmount ?? 0).toFixed(2),
      p.type ?? "",
      p.uid ?? "",
      selectedClubId,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `club-${selectedClubId}-payments.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const revenueStatement = useMemo(() => {
    const totals = filteredPayments.reduce(
      (acc, payment) => {
        acc.totalRevenue += payment.amount ?? 0;
        acc.hostEarnings += payment.hostAmount ?? 0;
        acc.platformFee += payment.platformFeeAmount ?? 0;
        acc.count += 1;
        return acc;
      },
      { totalRevenue: 0, hostEarnings: 0, platformFee: 0, count: 0 }
    );

    return {
      totalRevenue: centsToDollars(totals.totalRevenue),
      hostEarnings: centsToDollars(totals.hostEarnings),
      platformFee: centsToDollars(totals.platformFee),
      count: totals.count,
    };
  }, [filteredPayments]);

  // Fetch user and clubs by host email.
  const handleSearch = async () => {
    setError(null);
    setSearching(true);
    setClubs([]);
    setSelectedClubId(null);
    setPayments([]);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Enter an email to search.");
        return;
      }

      // 1) Find user by email.
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", normalizedEmail));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setError("No user found for that email.");
        return;
      }

      const userDoc = userSnapshot.docs[0];
      const uid = userDoc.id;

      // 2) Find clubs hosted by that user.
      const clubsRef = collection(db, "clubs");
      const clubsQuery = query(clubsRef, where("hostId", "==", uid));
      const clubsSnapshot = await getDocs(clubsQuery);

      if (clubsSnapshot.empty) {
        setError("This user has no clubs.");
        return;
      }

      const mappedClubs: ClubRow[] = clubsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const info = (data.info ?? {}) as Record<string, unknown>;
        const billing = (data.billing ?? {}) as Record<string, unknown>;
        return {
          id: docSnap.id,
          name: typeof info.name === "string" ? info.name : "Untitled club",
          slug: typeof info.slug === "string" ? info.slug : "—",
          createdAt: toDate(data.createdAt),
          billingTier:
            (
              data.hostStatus as Record<string, unknown> | undefined
            )?.billingTier?.toString?.() ??
            (billing.tier as string | undefined) ??
            "—",
          planType:
            (
              data.hostStatus as Record<string, unknown> | undefined
            )?.planType?.toString?.() ??
            (info.planType as string | undefined) ??
            "—",
          membersCount: toNumber(data.membersCount, 0),
          memberCost: toNumber(info.price, 0),
        };
      });

      setClubs(mappedClubs);
    } catch (err) {
      console.error("Failed to search clubs", err);
      setError("Unable to search right now. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Fetch payments for selected club.
  const handleLoadPayments = async (clubId: string) => {
    setSelectedClubId(clubId);
    setPayments([]);
    setLoadingPayments(true);
    setError(null);

    try {
      const paymentsRef = collection(db, "payments");
      const paymentsQuery = query(paymentsRef, where("clubId", "==", clubId));
      const snapshot = await getDocs(paymentsQuery);

      if (snapshot.empty) {
        setPayments([]);
        return;
      }

      const mappedPayments: Payment[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          amount: toNumber(data.amount, 0),
          hostAmount: toNumber(data.hostAmount, 0),
          platformFeeAmount: toNumber(data.platformFeeAmount, 0),
          createdAt: toDate(data.createdAt),
          type: typeof data.type === "string" ? data.type : undefined,
          uid: typeof data.uid === "string" ? data.uid : undefined,
        };
      });

      setPayments(mappedPayments);
    } catch (err) {
      console.error("Failed to load payments", err);
      setError("Unable to load payments for this club.");
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (!selectedClubId) {
      setPayments([]);
      return;
    }
  }, [selectedClubId]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">
              Host email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@example.com"
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Clubs</h2>
          <p className="text-sm text-slate-500">
            {clubs.length ? `${clubs.length} result(s)` : "No clubs loaded"}
          </p>
        </div>

        {!clubs.length && !searching && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            Search by host email to load clubs.
          </div>
        )}

        {clubs.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-7 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 md:grid">
              <span>Name</span>
              <span>Slug</span>
              <span>Created</span>
              <span>Plan</span>
              <span>Members</span>
              <span>Member Cost</span>
            </div>
            <div className="divide-y divide-slate-200">
              {clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => handleLoadPayments(club.id)}
                  className={`grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition hover:bg-slate-50 md:grid-cols-7 md:items-center ${
                    selectedClubId === club.id ? "bg-slate-50" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{club.name}</p>
                    <p className="text-xs text-slate-500">ID: {club.id}</p>
                  </div>
                  <div className="text-sm text-slate-700">{club.slug}</div>
                  <div className="text-sm text-slate-700">
                    {formatDate(club.createdAt ?? undefined)}
                  </div>
                  <div className="text-sm text-slate-700">
                    {club.planType ?? "—"}
                  </div>
                  <div className="text-sm text-slate-700">
                    {club.membersCount ?? 0}
                  </div>
                  <div className="text-sm text-slate-700">
                    ${(club.memberCost ?? 0).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue Statement
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Start
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                End
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-inner">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Sort
              </label>
              <button
                type="button"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {sortDirection === "asc" ? "Old → New" : "New → Old"}
              </button>
            </div>
            <button
              type="button"
              onClick={exportPaymentsCsv}
              disabled={!selectedClubId || filteredPayments.length === 0}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export CSV
            </button>
          </div>
        </div>

        {!selectedClubId && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            Select a club to view revenue.
          </div>
        )}

        {selectedClubId && loadingPayments && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading payments…
          </div>
        )}

        {selectedClubId && !loadingPayments && payments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No payments found for this club.
          </div>
        )}

        {selectedClubId && !loadingPayments && payments.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <ClubRevenueCard
                label="Total Revenue"
                value={`$${revenueStatement.totalRevenue.toFixed(2)}`}
                tone="slate"
              />
              <ClubRevenueCard
                label="Host Earnings"
                value={`$${revenueStatement.hostEarnings.toFixed(2)}`}
                tone="emerald"
              />
              <ClubRevenueCard
                label="Platform Fee"
                value={`$${revenueStatement.platformFee.toFixed(2)}`}
                tone="amber"
              />
              <ClubRevenueCard
                label="Total Transactions"
                value={revenueStatement.count.toString()}
                tone="blue"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[760px]">
                <div className="hidden grid-cols-7 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 md:grid">
                  <span>Date</span>
                  <span>Total</span>
                  <span>Host</span>
                  <span>Platform</span>
                  <span>Type</span>
                  <span>Paid by</span>
                  <span>Payment ID</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredPayments.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-slate-500">
                      No payments in this date range.
                    </div>
                  ) : (
                    filteredPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-1 gap-3 px-4 py-3 text-sm text-slate-800 md:grid-cols-7 md:items-center"
                      >
                        <span className="font-medium text-slate-900">
                          {formatDateTime(payment.createdAt)}
                        </span>
                        <span>${centsToDollars(payment.amount).toFixed(2)}</span>
                        <span>
                          ${centsToDollars(payment.hostAmount ?? 0).toFixed(2)}
                        </span>
                        <span>
                          ${centsToDollars(payment.platformFeeAmount ?? 0).toFixed(2)}
                        </span>
                        <span className="uppercase text-xs tracking-wide text-slate-600">
                          {payment.type ?? "—"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-slate-700">
                          <span className="font-mono text-xs break-all">
                            {payment.uid ?? "—"}
                          </span>
                          {payment.uid && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigator.clipboard.writeText(payment.uid ?? "");
                              }}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-slate-700">
                          <span className="font-mono text-xs break-all">
                            {payment.id}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigator.clipboard.writeText(payment.id);
                            }}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
