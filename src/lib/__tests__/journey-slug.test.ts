import { describe, expect, it, beforeEach, vi } from "vitest";
import type { firestore } from "firebase-admin";
import { resolveJourneySlug, slugifyJourneyTitle } from "@/lib/journeys/slug";

const { collectionMock } = vi.hoisted(() => ({
  collectionMock: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: collectionMock,
  },
}));

function buildJourneyCollectionMock() {
  let lastCandidate: string | null = null;

  const journeysCollectionMock = {
    where: vi
      .fn()
      .mockImplementation((_field: string, _op: string, value: unknown) => {
        lastCandidate = typeof value === "string" ? value : null;
        return journeysCollectionMock;
      }),
    limit: vi.fn().mockImplementation(() => ({ candidate: lastCandidate })),
  };

  const clubDocRefMock = {
    collection: vi.fn().mockReturnValue(journeysCollectionMock),
  };

  const clubsCollectionMock = {
    doc: vi.fn().mockReturnValue(clubDocRefMock),
  };

  collectionMock.mockReturnValue(clubsCollectionMock);

  return { journeysCollectionMock };
}

describe("journey slug helpers", () => {
  beforeEach(() => {
    collectionMock.mockReset();
  });

  it("slugifyJourneyTitle creates URL-safe kebab case slugs", () => {
    expect(slugifyJourneyTitle("  Hello World  ")).toBe("hello-world");
    expect(slugifyJourneyTitle("Crème Brûlée for AI!")).toBe("creme-brulee-for-ai");
    expect(slugifyJourneyTitle("--Already--Sluggy--")).toBe("already-sluggy");
  });

  it("resolveJourneySlug uses the base slug when available", async () => {
    const { journeysCollectionMock } = buildJourneyCollectionMock();
    const txGet = vi.fn().mockResolvedValue({ empty: true });
    const tx = { get: txGet } as unknown as firestore.Transaction;

    const slug = await resolveJourneySlug(tx, "club123", "Hello World");

    expect(slug).toBe("hello-world");
    expect(journeysCollectionMock.where).toHaveBeenCalledWith(
      "slug",
      "==",
      "hello-world"
    );
    expect(txGet).toHaveBeenCalledOnce();
  });

  it("resolveJourneySlug appends a numeric suffix when a slug already exists", async () => {
    const { journeysCollectionMock } = buildJourneyCollectionMock();
    const txGet = vi.fn().mockImplementation(
      async (query: { candidate: string | null }) => ({
        empty: query.candidate !== "hello-world",
      })
    );
    const tx = { get: txGet } as unknown as firestore.Transaction;

    const slug = await resolveJourneySlug(tx, "club123", "Hello World");

    expect(slug).toBe("hello-world-2");
    expect(journeysCollectionMock.where).toHaveBeenCalledTimes(2);
  });
});

