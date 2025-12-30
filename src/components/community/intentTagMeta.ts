import type { IntentTag } from "@/types/community";

export interface IntentTagMeta {
  label: string;
  emoji: string;
}

export const INTENT_TAG_ORDER: IntentTag[] = [
  "open_for_discussion",
  "prefer_host_input",
  "any_recommendations",
  "reflecting",
  "celebration",
  "seeking_help",
];

export const INTENT_TAG_META: Record<IntentTag, IntentTagMeta> = {
  open_for_discussion: {
    label: "Open for Discussion",
    emoji: "💬",
  },
  prefer_host_input: {
    label: "Prefer Host Input",
    emoji: "🎯",
  },
  any_recommendations: {
    label: "Any Recommendations?",
    emoji: "✨",
  },
  reflecting: {
    label: "Reflecting",
    emoji: "🧠",
  },
  celebration: {
    label: "Celebration",
    emoji: "🎉",
  },
  seeking_help: {
    label: "Seeking Help",
    emoji: "🤝",
  },
};

export const getIntentTagMeta = (tag: IntentTag): IntentTagMeta =>
  INTENT_TAG_META[tag];
