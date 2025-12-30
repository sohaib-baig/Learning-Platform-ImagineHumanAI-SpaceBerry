"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, fromCents } from "@/lib/stripe";
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClubDoc } from "@/types/club";

interface Payment {
  id: string;
  uid: string;
  clubId: string;
  type: "subscription" | "one_time";
  amount: number;
  currency: string;
  stripe: {
    sessionId: string;
    customerId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    paymentIntentId?: string;
    status: string;
  };
  createdAt: Date;
}

interface PayoutSummary {
  clubId: string;
  clubName: string;
  hostId: string;
  totalPayments: number;
  grossAmount: number;
  currency: string;
}

/**
 * Admin Payouts Page
 * Scaffold for manual payout reporting and management
 */
export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payoutSummaries, setPayoutSummaries] = useState<PayoutSummary[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        router.push("/signin");
        return;
      }

      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        if (!userData?.roles?.admin) {
          router.push("/dashboard");
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Failed to verify admin access");
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, router]);

  // Fetch payments data
  const fetchPayments = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      let paymentsQuery = query(
        collection(db, "payments"),
        orderBy("createdAt", "desc")
      );

      // Apply filters if provided
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        paymentsQuery = query(
          collection(db, "payments"),
          where("createdAt", ">=", Timestamp.fromDate(fromDate)),
          orderBy("createdAt", "desc")
        );
      }

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData: Payment[] = [];

      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        paymentsData.push({
          id: doc.id,
          uid: data.uid,
          clubId: data.clubId,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          stripe: data.stripe,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      // Filter by date range and club
      let filteredPayments = paymentsData;
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredPayments = filteredPayments.filter(
          (p) => p.createdAt >= fromDate
        );
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filteredPayments = filteredPayments.filter(
          (p) => p.createdAt <= toDate
        );
      }
      
      if (selectedClubId !== "all") {
        filteredPayments = filteredPayments.filter(
          (p) => p.clubId === selectedClubId
        );
      }

      setPayments(filteredPayments);

      // Calculate payout summaries
      await calculatePayoutSummaries(filteredPayments);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Failed to fetch payments data");
      setLoading(false);
    }
  };

  // Calculate payout summaries by club
  const calculatePayoutSummaries = async (paymentsData: Payment[]) => {
    const summaryMap = new Map<string, PayoutSummary>();

    // Get club data for each payment
    const clubIds = Array.from(
      new Set(
        paymentsData
          .map((payment) => payment.clubId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const clubsData = new Map<string, ClubDoc>();

    for (const clubId of clubIds) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const clubDoc = await getDoc(doc(db, "clubs", clubId));
        if (clubDoc.exists()) {
          clubsData.set(clubId, clubDoc.data() as ClubDoc);
        }
      } catch (err) {
        console.error(`Error fetching club ${clubId}:`, err);
      }
    }

    // Group payments by club
    for (const payment of paymentsData) {
      if (payment.type !== "subscription" || !payment.clubId) continue;

      const clubData = clubsData.get(payment.clubId);
      if (!clubData) continue;

      const key = payment.clubId;
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          clubId: payment.clubId,
          clubName: clubData.info?.name || "Unknown Club",
          hostId: clubData.hostId || "",
          totalPayments: 0,
          grossAmount: 0,
          currency: payment.currency,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.totalPayments += 1;
      summary.grossAmount += payment.amount;
    }

    setPayoutSummaries(Array.from(summaryMap.values()));
  };

  // Export to CSV
  const exportToCSV = () => {
    if (payoutSummaries.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Club ID", "Club Name", "Host ID", "Total Payments", "Gross Amount", "Currency", "Fees (TBD)", "Net Amount (TBD)"];
    const rows = payoutSummaries.map((summary) => [
      summary.clubId,
      summary.clubName,
      summary.hostId,
      summary.totalPayments.toString(),
      fromCents(summary.grossAmount).toFixed(2),
      summary.currency,
      "TBD",
      "TBD",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `payouts_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Manual Payouts
          </h1>
          <p className="text-gray-600">
            Review and export payment data for manual host payouts
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Club
              </label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Clubs</option>
                {/* Add club options dynamically in production */}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={fetchPayments}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setSelectedClubId("all");
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Payout Summaries */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              Payout Summaries by Club
            </h2>
            <button
              onClick={exportToCSV}
              disabled={payoutSummaries.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
          
          {payoutSummaries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No payout data available. Apply filters and click &quot;Apply Filters&quot; to load data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Host ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payments
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Payout
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payoutSummaries.map((summary) => (
                    <tr key={summary.clubId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.clubName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {summary.hostId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {summary.totalPayments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatPrice(fromCents(summary.grossAmount), summary.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        TBD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        TBD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Individual Payments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              All Payments ({payments.length})
            </h2>
          </div>
          
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No payments found. Apply filters to load data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.type === "subscription"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {payment.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payment.uid.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {payment.clubId ? `${payment.clubId.substring(0, 8)}...` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatPrice(fromCents(payment.amount), payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.stripe.status === "succeeded"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {payment.stripe.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

