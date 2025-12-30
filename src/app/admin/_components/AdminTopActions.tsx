"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth-client";

/**
 * Small action bar for admin pages to sign out quickly.
 */
export function AdminTopActions() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push("/");
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
      >
        Sign out
      </button>
    </div>
  );
}
