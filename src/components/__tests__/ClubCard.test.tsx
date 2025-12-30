import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ClubCard } from "../ClubCard";
import type { Club } from "@/types/club";

const mockGetDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

const baseClub: Club = {
  id: "club-1",
  info: {
    name: "AI Enthusiasts",
    slug: "ai-enthusiasts",
    description: "A club about AI",
    vision: "Explore AI together",
    mission: "Mission",
    videoUrl: "",
    bannerUrl: "",
    profileImageUrl: "",
    benefits: [],
    price: 10,
    currency: "USD",
    recommendedClubs: [],
  },
  hostId: "host-123",
  membersCount: 120,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("ClubCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockImplementation((...args: unknown[]) => ({ path: args.join("/") }));
  });

  it("shows host info and active badges next to the name", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: "Test Host", photoURL: "http://example.com/photo.jpg" }),
    });

    render(<ClubCard club={baseClub} variant="dark" />);

    await waitFor(() => {
      expect(screen.getByText("Test Host")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Active Host badge/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Community Builder badge/i)).toBeInTheDocument();
  });

  it("hides badges when none are active", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    const freeClub: Club = {
      ...baseClub,
      hostId: "host-free",
      info: { ...baseClub.info, price: 0 },
      membersCount: 2,
      updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      meta: { badges: { activeHost: false, communityBuilder: false, featuredByImagineHumans: false } },
    };

    render(<ClubCard club={freeClub} variant="dark" />);

    await waitFor(() => expect(screen.getByText("Club host")).toBeInTheDocument());
    expect(screen.queryByLabelText(/badge/i)).not.toBeInTheDocument();
  });
});
