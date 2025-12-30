import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClubDirectory } from "../ClubDirectory";

const mockGetDocs = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockCollection = vi.fn();
const mockDocumentId = vi.fn();
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();

vi.mock("@/lib/firebase", () => ({
  db: {},
  functions: {},
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  startAfter: (...args: unknown[]) => mockStartAfter(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  documentId: (...args: unknown[]) => mockDocumentId(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

type MockTimestamp = { toDate: () => Date };

interface MockClubDoc {
  id: string;
  data: () => {
    info: {
      name: string;
      slug: string;
      description: string;
      vision: string;
      mission: string;
      benefits: string[];
      price: number;
      currency: string;
      recommendedClubs: string[];
    };
    hostId: string;
    membersCount: number;
    createdAt: MockTimestamp;
    updatedAt: MockTimestamp;
  };
}

const createClubDoc = (id: string, membersCount: number): MockClubDoc => ({
  id,
  data: () => ({
    info: {
      name: `Club ${id}`,
      slug: `club-${id}`,
      description: "",
      vision: `Vision ${id}`,
      mission: "",
      benefits: [],
      price: 0,
      currency: "AUD",
      recommendedClubs: [],
    },
    hostId: `host-${id}`,
    membersCount,
    createdAt: { toDate: () => new Date("2024-01-01T00:00:00Z") },
    updatedAt: { toDate: () => new Date("2024-01-02T00:00:00Z") },
  }),
});

describe("ClubDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReturnValue({ query: "clubs-query" });
    mockOrderBy.mockImplementation((...args: unknown[]) => ({
      orderBy: args,
    }));
    mockLimit.mockImplementation((value: number) => ({ limit: value }));
    mockStartAfter.mockImplementation((...args: unknown[]) => ({
      startAfter: args,
    }));
    mockDocumentId.mockReturnValue("document-id");
    mockDoc.mockImplementation((...args: unknown[]) => ({ path: args.join("/") }));
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });

  it("renders initial clubs and hides load more when under the initial limit", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [createClubDoc("1", 30), createClubDoc("2", 20), createClubDoc("3", 10)],
    });

    render(<ClubDirectory title="Directory" description="Browse clubs" />);

    expect(await screen.findByText("Club 1")).toBeInTheDocument();
    expect(screen.getByText("Club 2")).toBeInTheDocument();
    expect(screen.getByText("Club 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /see more/i })).not.toBeInTheDocument();
    expect(mockLimit).toHaveBeenCalledWith(6);
  });

  it("loads additional clubs when clicking See more", async () => {
    const firstDocs = [
      createClubDoc("1", 100),
      createClubDoc("2", 90),
      createClubDoc("3", 80),
      createClubDoc("4", 70),
      createClubDoc("5", 60),
      createClubDoc("6", 50),
    ];
    const nextDocs = [createClubDoc("7", 40), createClubDoc("8", 30)];

    mockGetDocs
      .mockResolvedValueOnce({ docs: firstDocs })
      .mockResolvedValueOnce({ docs: nextDocs });

    render(<ClubDirectory title="Directory" description="Browse clubs" />);

    expect(await screen.findByText("Club 1")).toBeInTheDocument();
    const loadMoreButton = screen.getByRole("button", { name: /see more/i });

    fireEvent.click(loadMoreButton);

    await waitFor(() => expect(mockGetDocs).toHaveBeenCalledTimes(2));

    expect(screen.getByText("Club 7")).toBeInTheDocument();
    expect(screen.getByText("Club 8")).toBeInTheDocument();
    expect(mockLimit.mock.calls.map(([value]) => value)).toEqual([6, 12]);
    expect(mockStartAfter).toHaveBeenCalledWith(firstDocs[firstDocs.length - 1]);
    expect(screen.queryByRole("button", { name: /see more/i })).not.toBeInTheDocument();
  });

  it("marks hosted clubs when provided", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [createClubDoc("1", 25)],
    });

    render(
      <ClubDirectory
        title="Directory"
        description="Browse clubs"
        hostedClubIds={["1"]}
      />
    );

    expect(await screen.findByText("Hosting")).toBeInTheDocument();
  });
});
