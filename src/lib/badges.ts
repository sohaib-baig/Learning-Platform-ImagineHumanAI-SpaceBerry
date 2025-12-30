import { differenceInCalendarDays } from "date-fns";
import { HandHeart, Sparkles, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ClubBadges, Club } from "@/types/club";

export type ClubBadgeKey =
  | "activeHost"
  | "communityBuilder"
  | "featuredByImagineHumans";

export interface ClubBadgeDefinition {
  key: ClubBadgeKey;
  icon: LucideIcon;
  label: string;
  description: string;
}

export const ACTIVE_HOST_WINDOW_DAYS = 30;

export const CLUB_BADGE_DEFINITIONS: Record<ClubBadgeKey, ClubBadgeDefinition> =
  {
    activeHost: {
      key: "activeHost",
      icon: Sprout,
      label: "Active Host",
      description: "Tended their space within the last 30 days",
    },
    communityBuilder: {
      key: "communityBuilder",
      icon: HandHeart,
      label: "Community Builder",
      description: "A growing circle of 10+ members",
    },
    featuredByImagineHumans: {
      key: "featuredByImagineHumans",
      icon: Sparkles,
      label: "Featured by ImagineHumans",
      description: "Handpicked for alignment and care",
    },
  };

const DEFAULT_BADGES: ClubBadges = {
  activeHost: false,
  communityBuilder: false,
  featuredByImagineHumans: false,
};

export function getDefaultClubBadges(): ClubBadges {
  return { ...DEFAULT_BADGES };
}

export function normalizeClubBadges(
  badges?: Partial<ClubBadges> | null
): ClubBadges {
  return {
    activeHost: badges?.activeHost === true,
    communityBuilder: badges?.communityBuilder === true,
    featuredByImagineHumans: badges?.featuredByImagineHumans === true,
  };
}

export function evaluateClubBadges(
  club: Pick<Club, "membersCount" | "updatedAt" | "meta">
): ClubBadges {
  const base = normalizeClubBadges(club.meta?.badges);

  const updatedAtDate = club.updatedAt ? new Date(club.updatedAt) : null;
  const isRecent =
    updatedAtDate instanceof Date &&
    !Number.isNaN(updatedAtDate.getTime()) &&
    differenceInCalendarDays(new Date(), updatedAtDate) <=
      ACTIVE_HOST_WINDOW_DAYS;

  const hasCommunity = Number(club.membersCount) >= 10;

  return {
    activeHost: isRecent,
    communityBuilder: hasCommunity,
    featuredByImagineHumans: base.featuredByImagineHumans,
  };
}
