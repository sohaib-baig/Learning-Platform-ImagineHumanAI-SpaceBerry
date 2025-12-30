"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ClubBadges } from "@/types/club";
import { CLUB_BADGE_DEFINITIONS, type ClubBadgeKey } from "@/lib/badges";

interface ClubBadgesProps {
  badges: ClubBadges;
  className?: string;
}

const activeBadgeKeys = (badges: ClubBadges): ClubBadgeKey[] =>
  (Object.keys(badges) as ClubBadgeKey[]).filter(
    (key) => badges[key] === true
  );

export function ClubBadgesBar({ badges, className = "" }: ClubBadgesProps) {
  const keys = activeBadgeKeys(badges);
  const [openKey, setOpenKey] = useState<ClubBadgeKey | null>(null);
  const [tooltip, setTooltip] = useState<{
    key: ClubBadgeKey;
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const updateTooltip = useCallback(
    (key: ClubBadgeKey, text: string, target: HTMLElement | null) => {
      if (!target) {
        setTooltip(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setTooltip({
        key,
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    },
    []
  );

  useEffect(() => {
    const handler = () => setTooltip((current) => (current ? { ...current, y: current.y } : null));
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, []);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key) => {
        const definition = CLUB_BADGE_DEFINITIONS[key];
        const isOpen = openKey === key;

        return (
          <button
            key={key}
            type="button"
            onMouseEnter={(event) => {
              setOpenKey(key);
              updateTooltip(key, definition.description, event.currentTarget);
            }}
            onMouseLeave={() => setOpenKey((current) => (current === key ? null : current))}
            onFocus={(event) => {
              setOpenKey(key);
              updateTooltip(key, definition.description, event.currentTarget);
            }}
            onBlur={() => setOpenKey((current) => (current === key ? null : current))}
            onClick={(event) => {
              setOpenKey((current) => (current === key ? null : key));
              updateTooltip(key, definition.description, event.currentTarget);
            }}
            className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm leading-none text-primary ring-1 ring-primary/30 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={`${definition.label} badge`}
          >
            <definition.icon aria-hidden="true" className="h-3.5 w-3.5" />
            {isOpen && tooltip?.key === key && tooltip.text === definition.description && tooltip.x && tooltip.y
              ? createPortal(
                  <div
                    className="pointer-events-none fixed z-[9999] w-56 -translate-x-1/2 -translate-y-full rounded-md bg-[#0f172a] px-3 py-2 text-xs font-medium text-zinc-200 shadow-2xl ring-1 ring-white/10"
                    style={{ left: tooltip.x, top: tooltip.y }}
                  >
                    {definition.description}
                  </div>,
                  document.body
                )
              : null}
          </button>
        );
      })}
    </div>
  );
}
