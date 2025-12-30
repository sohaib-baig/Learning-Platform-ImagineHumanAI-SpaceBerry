"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { startHostFeeCheckout } from "@/lib/stripe";

/**
 * Become a Host Page
 * Handles the $1 host onboarding fee payment
 */
function BecomeHostPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const status = searchParams.get("status");

  useEffect(() => {
    // Check if user is already a host
    if (user) {
      const checkHostStatus = async () => {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          if (userData?.roles?.host) {
            setIsHost(true);
          }
        } catch (err) {
          console.error("Error checking host status:", err);
        }
      };
      checkHostStatus();
    }
  }, [user]);

  const handlePayment = async () => {
    if (!user) {
      router.push("/signin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startHostFeeCheckout();
    } catch (err) {
      console.error("Error processing payment:", err);
      setError(err instanceof Error ? err.message : "Failed to process payment");
      setLoading(false);
    }
  };

  // If not authenticated, redirect to signin
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            Become a Host
          </h1>
          <p className="text-gray-300 mb-6">
            Please sign in to continue
          </p>
          <button
            onClick={() => router.push("/signin")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Payment success
  if (status === "success" || isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome, Host!
            </h1>
            <p className="text-gray-300 mb-6">
              Your payment has been processed successfully. You are now a host on ImagineHumans Academy!
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              What&apos;s Next?
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Create your first club with a unique vision and mission</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Set up your club&apos;s pricing and benefits</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Build your community and start earning</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push("/create-club")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Create Your Club
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment cancelled
  if (status === "cancel") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Payment Cancelled
          </h1>
          <p className="text-gray-300 mb-6">
            Your payment was cancelled. No charges were made.
          </p>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Default: Show payment page
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          Become a Host
        </h1>
        <p className="text-gray-300 text-center mb-8">
          Start your journey as a club host on ImagineHumans Academy
        </p>

        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            What You&apos;ll Get
          </h2>
          <ul className="space-y-4 text-gray-300">
            <li className="flex items-start">
              <svg
                className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <div>
                <span className="font-semibold text-white">Create Your Own Club</span>
                <p className="text-sm text-gray-400">Build a community around your vision and mission</p>
              </div>
            </li>
            <li className="flex items-start">
              <svg
                className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="font-semibold text-white">Earn Monthly Revenue</span>
                <p className="text-sm text-gray-400">Set your own pricing and earn from memberships</p>
              </div>
            </li>
            <li className="flex items-start">
              <svg
                className="w-6 h-6 text-blue-400 mr-3 flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div>
                <span className="font-semibold text-white">Full Platform Support</span>
                <p className="text-sm text-gray-400">Access tools to manage content, members, and downloads</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                One-Time Host Fee
              </h3>
              <p className="text-gray-300 text-sm">
                Secure your spot as a host with a one-time payment
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">$1</div>
              <div className="text-sm text-gray-400">AUD</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            "Pay $1 and Become a Host"
          )}
        </button>

        <p className="text-gray-400 text-sm text-center mt-4">
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}

export default function BecomeHostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
          <div className="text-gray-300">Loading...</div>
        </div>
      }
    >
      <BecomeHostPageContent />
    </Suspense>
  );
}

