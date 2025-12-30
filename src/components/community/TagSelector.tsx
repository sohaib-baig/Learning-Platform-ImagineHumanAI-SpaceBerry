import React from "react";
import { IntentTag } from "@/types/community";
import {
  INTENT_TAG_META,
  INTENT_TAG_ORDER,
} from "@/components/community/intentTagMeta";

type TagStyle = {
  base: string;
  selected: string;
};

const TAG_STYLES: Record<IntentTag, TagStyle> = {
  open_for_discussion: {
    base: "border-slate-400/30 bg-slate-300/10 text-slate-100",
    selected:
      "border-sky-400/70 bg-sky-500/20 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.5)]",
  },
  prefer_host_input: {
    base: "border-rose-400/40 bg-rose-400/10 text-rose-100",
    selected:
      "border-rose-300/70 bg-rose-400/25 text-white shadow-[0_0_0_1px_rgba(248,113,113,0.5)]",
  },
  any_recommendations: {
    base: "border-amber-300/40 bg-amber-200/15 text-amber-100",
    selected:
      "border-amber-300/70 bg-amber-300/25 text-slate-900 shadow-[0_0_0_1px_rgba(252,211,77,0.6)]",
  },
  reflecting: {
    base: "border-purple-300/40 bg-purple-300/15 text-purple-100",
    selected:
      "border-purple-300/70 bg-purple-400/20 text-white shadow-[0_0_0_1px_rgba(216,180,254,0.6)]",
  },
  celebration: {
    base: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
    selected:
      "border-emerald-300/70 bg-emerald-300/25 text-slate-900 shadow-[0_0_0_1px_rgba(110,231,183,0.6)]",
  },
  seeking_help: {
    base: "border-orange-300/40 bg-orange-300/15 text-orange-100",
    selected:
      "border-orange-300/70 bg-orange-300/25 text-white shadow-[0_0_0_1px_rgba(253,186,116,0.55)]",
  },
};

/**
 * Props accepted by the TagSelector component.
 */
interface TagSelectorProps {
  value: IntentTag | null;
  onChange: (tag: IntentTag) => void;
  disabled?: boolean;
  className?: string;
}

/** Renders the available intent tags as pill-style buttons. */
export function TagSelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: TagSelectorProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="radiogroup"
      aria-label="Intent tag selector"
    >
      {INTENT_TAG_ORDER.map((tag) => {
        const isSelected = value === tag;
        const option = INTENT_TAG_META[tag];
        const palette = TAG_STYLES[tag];
        const toneClass = isSelected ? palette.selected : palette.base;

        const handleClick = () => {
          if (disabled) {
            return;
          }
          onChange(tag);
        };

        return (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={handleClick}
            aria-pressed={isSelected}
            aria-label={option.label}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
              border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40
              ${toneClass} hover:scale-[1.01]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span>{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

TagSelector.displayName = "TagSelector";
