import React from "react";

import { formatPrice as formatCurrency } from "@/lib/stripe";
import type { ClubDownload } from "@/types/club";

interface HostDownloadCardProps {
  download: ClubDownload;
  onSelect: (download: ClubDownload) => void;
  isHost?: boolean;
}

function formatPrice(download: ClubDownload): string {
  const price = typeof download.price === "number" ? download.price : 0;
  const currency = (download.currency ?? "AUD").toUpperCase();
  const isFree =
    download.isFree ?? !(typeof download.price === "number" && download.price > 0);

  if (isFree) {
    return "Free";
  }

  try {
    return formatCurrency(price, currency);
  } catch (error) {
    console.warn("[HostDownloadCard] Failed to format price:", error);
    return `${currency} ${price.toFixed(2)}`;
  }
}

function formatDate(value?: string): string {
  if (!value) {
    return "Recently updated";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function HostDownloadCard({
  download,
  onSelect,
  isHost = false,
}: HostDownloadCardProps) {
  const priceLabel = formatPrice(download);
  const updatedLabel = `Updated ${formatDate(download.updatedAt)}`;

  const isFree =
    download.isFree ?? !(typeof download.price === "number" && download.price > 0);
  const isOwned = Boolean(download.hasPurchased);
  const showOwnedBadge = isOwned && !isFree;

  const statusLabel = showOwnedBadge
    ? "Purchased"
    : isFree
      ? "Free access"
      : isHost
        ? "Host access"
        : "Purchase required";

  const statusClasses = showOwnedBadge
    ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
    : isFree || isHost
      ? "border border-primary/40 bg-primary/15 text-primary"
      : "border border-amber-400/40 bg-amber-500/15 text-amber-200";

  const priceBadgeClasses = isFree
    ? "border border-white/10 bg-white/5 text-zinc-300"
    : "border border-primary/30 bg-primary/10 text-primary";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(download);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(download)}
      onKeyDown={handleKeyDown}
      className="flex h-full flex-col gap-5 text-left transition-all duration-300 hover:scale-[1.02] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2 min-w-0">
          <h3 className="text-xl font-bold text-white leading-tight">
            {download.title}
          </h3>
          {download.description && (
            <p
              className="text-sm leading-relaxed text-zinc-400 line-clamp-2"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {download.description}
            </p>
          )}
        </div>

        <span
          className={`inline-flex flex-shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${priceBadgeClasses}`}
        >
          {priceLabel}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <span className="text-xs font-medium text-zinc-500">{updatedLabel}</span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wider ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

