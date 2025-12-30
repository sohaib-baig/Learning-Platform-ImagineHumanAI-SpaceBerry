import React, { useEffect } from "react";
import { X, Download as DownloadIcon } from "lucide-react";
import { formatPrice as formatCurrency } from "@/lib/stripe";
import type { ClubDownload } from "@/types/club";

interface DownloadDetailsDialogProps {
  open: boolean;
  download: ClubDownload | null;
  isHost: boolean;
  processing: boolean;
  error?: string | null;
  onClose: () => void;
  onDownload: (download: ClubDownload) => void;
  onEdit?: (download: ClubDownload) => void;
}

function formatPrice(download: ClubDownload): string {
  const price = typeof download.price === "number" ? download.price : 0;
  const currency = (download.currency ?? "AUD").toUpperCase();
  const isFree =
    download.isFree ?? !(typeof download.price === "number" && download.price > 0);

  if (isFree) {
    return "Free download";
  }

  return formatCurrency(price, currency);
}

function formatDatetime(value?: string): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DownloadDetailsDialog({
  open,
  download,
  isHost,
  processing,
  error,
  onClose,
  onDownload,
  onEdit,
}: DownloadDetailsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !download) {
    return null;
  }

  const priceLabel = formatPrice(download);
  const updatedLabel = formatDatetime(download.updatedAt);
  const purchasedLabel = download.hasPurchased
    ? `Purchased on ${formatDatetime(download.purchasedAt)}`
    : isHost
      ? "Host access"
      : download.isFree
        ? "Free access"
        : "Payment required";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1118]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[90vh]">
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-8 py-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
              Download details
            </p>
            <h2 className="text-2xl font-semibold text-white">{download.title}</h2>
            <p className="text-sm text-zinc-400">{purchasedLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="sr-only">Close</span>
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-col gap-6 overflow-y-auto overflow-x-auto px-8 py-8">
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
              Description
            </h3>
            <p className="whitespace-pre-line text-base leading-relaxed text-zinc-200">
              {download.description || "No description provided."}
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-2">
                Price
              </p>
              <p className="text-xl font-semibold text-white">{priceLabel}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-2">
                Last updated
              </p>
              <p className="text-xl font-semibold text-white">{updatedLabel}</p>
            </div>
          </section>
        </div>

        {error && (
          <div className="px-8 pb-2">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          </div>
        )}

        <footer className="flex flex-col gap-4 border-t border-white/5 px-8 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-zinc-400">
            {download.hasPurchased || download.isFree || isHost
              ? "You have access to this download."
              : "Complete a secure payment to unlock this download."}
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {isHost && onEdit && (
              <button
                type="button"
                onClick={() => {
                  if (download) {
                    onEdit(download);
                  }
                }}
                disabled={processing}
                className="inline-flex items-center justify-center rounded-2xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit download
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              disabled={processing}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onDownload(download)}
              disabled={processing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon size={16} aria-hidden="true" />
              {processing
                ? "Preparing..."
                : download.hasPurchased || download.isFree || isHost
                  ? "Download now"
                  : "Purchase & download"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

