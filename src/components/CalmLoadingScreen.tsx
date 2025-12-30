"use client";

interface CalmLoadingScreenProps {
  message?: string;
}

export function CalmLoadingScreen({
  message = "Ayubowan...",
}: CalmLoadingScreenProps) {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0b1829] to-slate-900 text-slate-100"
      aria-live="polite"
      role="status"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(89,184,245,0.16),transparent_45%),radial-gradient(circle_at_75%_30%,rgba(112,128,249,0.14),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.12),transparent_60%)] opacity-80" />
      <div className="relative flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/80 border-t-transparent" />
        <p className="text-sm font-medium tracking-wide">{message}</p>
      </div>
    </div>
  );
}
