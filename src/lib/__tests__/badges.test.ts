import { describe, it, expect } from "vitest";
import {
  evaluateClubBadges,
  getDefaultClubBadges,
  normalizeClubBadges,
  ACTIVE_HOST_WINDOW_DAYS,
} from "@/lib/badges";
import type { Club } from "@/types/club";

const buildClub = (overrides: Partial<Club> = {}): Club => {
  const now = new Date().toISOString();
  return {
    id: "club-1",
    info: {
      name: "Test Club",
      slug: "test-club",
      description: "",
      vision: "",
      mission: "",
      benefits: [],
      price: 0,
      currency: "AUD",
      recommendedClubs: [],
    },
    hostId: "host-1",
    membersCount: 0,
    meta: { badges: getDefaultClubBadges() },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

describe("badges helpers", () => {
  it("returns default badges with all false values", () => {
    const defaults = getDefaultClubBadges();
    expect(defaults).toEqual({
      activeHost: false,
      communityBuilder: false,
      featuredByImagineHumans: false,
    });
  });

  it("normalizes partial badges to booleans", () => {
    const normalized = normalizeClubBadges({
      activeHost: true,
    });
    expect(normalized).toEqual({
      activeHost: true,
      communityBuilder: false,
      featuredByImagineHumans: false,
    });
  });

  it("enables Active Host when updated within the window", () => {
    const club = buildClub({
      updatedAt: new Date().toISOString(),
    });
    const badges = evaluateClubBadges(club);
    expect(badges.activeHost).toBe(true);
  });

  it("disables Active Host when last updated is outside the window", () => {
    const past = new Date();
    past.setDate(past.getDate() - (ACTIVE_HOST_WINDOW_DAYS + 5));
    const club = buildClub({ updatedAt: past.toISOString() });
    const badges = evaluateClubBadges(club);
    expect(badges.activeHost).toBe(false);
  });

  it("enables Community Builder when members reach threshold", () => {
    const club = buildClub({ membersCount: 12 });
    const badges = evaluateClubBadges(club);
    expect(badges.communityBuilder).toBe(true);
  });

  it("respects manual Featured badge without altering others", () => {
    const club = buildClub({
      membersCount: 2,
      meta: { badges: { ...getDefaultClubBadges(), featuredByImagineHumans: true } },
    });
    const badges = evaluateClubBadges(club);
    expect(badges.featuredByImagineHumans).toBe(true);
    expect(badges.communityBuilder).toBe(false);
  });
});
