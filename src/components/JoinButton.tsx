"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { joinFreeClub } from "@/lib/club";
import { toast } from "@/lib/toast";

interface JoinButtonProps {
  clubId: string;
  clubSlug: string;
  price: number;
  currency: string;
  isMember: boolean;
  isHost: boolean;
}

/**
 * JoinButton Component
 * Handles club membership via Stripe checkout
 */
export function JoinButton({
  clubId,
  clubSlug,
  price,
  currency,
  isMember,
  isHost,
}: JoinButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // If already a member or host, show different button
  if (isMember || isHost) {
    return (
      <button
        onClick={() => router.push(`/club/${clubSlug}/dashboard`)}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform active:scale-95"
      >
        Go to space
      </button>
    );
  }

  const handleJoin = async () => {
    if (!user) {
      router.push("/signin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (price > 0) {
        const { startClubCheckout } = await import("@/lib/stripe");
        await startClubCheckout(clubId);
        return;
      }

      await joinFreeClub(clubId);
      toast.success("You've joined this free club!");
      router.push(`/club/${clubSlug}/dashboard`);
    } catch (err) {
      console.error("Error joining club:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not join club. Please try again.";
      toast.error("Could not join club. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/30 via-sky-400/20 to-sky-500/30 blur-xl transition-opacity duration-300 ${
          loading ? "opacity-40" : "opacity-70 animate-pulse"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl border border-sky-400/40 transition-opacity duration-300 ${
          loading ? "opacity-30" : "opacity-60 animate-pulse"
        }`}
      />
      <button
        onClick={handleJoin}
        disabled={loading}
        className="relative w-full bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 disabled:from-zinc-600 disabled:to-zinc-600 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
        ) : price > 0 ? (
          `Start trial for ${currency} $${price.toFixed(2)}/mo`
        ) : (
          "Join for Free"
        )}
      </button>

      {error && (
        <p className="mt-2 text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
