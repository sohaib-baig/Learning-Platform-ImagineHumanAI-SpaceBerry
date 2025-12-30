import { describe, it, expect, vi, beforeEach } from "vitest";
import { markLessonCompleted } from "../classroom";

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const serverTimestampMock = vi.fn(() => "server-timestamp");
const clubLessonProgressDocRefMock = vi.fn(() => "progress-doc-ref");

vi.mock("firebase/firestore", () => ({
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: (...args: unknown[]) => serverTimestampMock(...args),
  doc: vi.fn(),
}));

vi.mock("../../firestorePaths", () => ({
  clubLessonProgressDocRef: (...args: unknown[]) =>
    clubLessonProgressDocRefMock(...args),
}));

describe("markLessonCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates lesson completion doc when missing", async () => {
    getDocMock.mockResolvedValue({
      exists: () => false,
    });

    await markLessonCompleted({
      uid: "user-1",
      clubId: "club-1",
      journeyId: "journey-1",
      lessonId: "lesson-1",
    });

    expect(clubLessonProgressDocRefMock).toHaveBeenCalledWith(
      "club-1",
      "journey-1",
      "lesson-1",
      "user-1"
    );
    expect(setDocMock).toHaveBeenCalledWith(
      "progress-doc-ref",
      expect.objectContaining({
        uid: "user-1",
        status: "completed",
        startedAt: "server-timestamp",
        completedAt: "server-timestamp",
        updatedAt: "server-timestamp",
      }),
      { merge: true }
    );
  });

  it("keeps existing completion timestamps when already completed", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        status: "completed",
        startedAt: "existing-start",
        completedAt: "existing-complete",
      }),
    });

    await markLessonCompleted({
      uid: "user-2",
      clubId: "club-9",
      journeyId: "journey-9",
      lessonId: "lesson-9",
    });

    expect(setDocMock).toHaveBeenCalled();
    const payload = setDocMock.mock.calls[0][1];
    expect(payload.startedAt).toBeUndefined();
    expect(payload.completedAt).toBeUndefined();
    expect(payload.status).toBe("completed");
  });
});

