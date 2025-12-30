/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Mock Firebase
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mocked-timestamp"),
}));

// Import after mocks
import { upsertUserProfile } from "../../lib/auth-profile";
import { db } from "../../lib/firebase";
import { analytics } from "../../lib/analytics";

// Mock additional dependencies
vi.mock("../../lib/firebase", () => ({
  db: {},
}));

vi.mock("../../lib/analytics", () => ({
  analytics: {
    track: vi.fn(),
  },
}));

describe("User Profile Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a new Google user profile on first sign in", async () => {
    // Mock getDoc to return non-existent document
    const mockSnap = {
      exists: () => false,
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    // Test data
    const userData = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: "https://example.com/photo.jpg",
      emailVerified: true,
      provider: "google",
      googleDisplayName: "Test User",
    };

    // Execute function
    const isNewUser = await upsertUserProfile(userData);
    expect(isNewUser).toBe(true);

    // Verify doc was called correctly
    expect(doc).toHaveBeenCalledWith(db, "users", "test-uid");

    // Verify first-time user flow
    const firstCallArgs = (setDoc as any).mock.calls[0];
    expect(firstCallArgs[1]).toMatchObject({
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: "https://example.com/photo.jpg",
      photoUpdatedAt: "mocked-timestamp",
      emailVerified: true,
      provider: "google",
      authProvider: "google",
      googleDisplayName: "Test User",
      roles: { user: true, host: false },
      clubsJoined: [],
      clubsHosted: [],
      hostStatus: { enabled: false },
      createdAt: "mocked-timestamp",
      welcomeEmailSent: false,
    });

    // Verify analytics was called
    expect(analytics.track).toHaveBeenCalledWith("signup_google", { userId: "test-uid" });

    // Only one setDoc invocation for initial creation
    expect((setDoc as any).mock.calls.length).toBe(1);
  });

  it("updates existing user profile for returning Google user without overwriting displayName", async () => {
    // Mock getDoc to return existing document
    const mockSnap = {
      exists: () => true,
      data: () => ({
        uid: "test-uid",
        displayName: "Custom Name",
        email: "test@example.com",
        roles: { user: true, host: false },
        welcomeEmailSent: true,
      }),
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    // Test data
    const userData = {
      uid: "test-uid",
      displayName: "Google User",
      email: "test@example.com",
      photoURL: "https://example.com/new-photo.jpg",
      emailVerified: true,
      provider: "google",
      googleDisplayName: "Latest Google Name",
    };

    // Execute function
    const isNewUser = await upsertUserProfile(userData);
    expect(isNewUser).toBe(false);

    // Verify doc was called correctly
    expect(doc).toHaveBeenCalledWith(db, "users", "test-uid");

    // Verify returning user flow (merge update)
    const callArgs = (setDoc as any).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      provider: "google",
      authProvider: "google",
      photoURL: "https://example.com/new-photo.jpg",
      photoUpdatedAt: "mocked-timestamp",
      googleDisplayName: "Latest Google Name",
    });
    expect(callArgs[1]).not.toHaveProperty("displayName");
    expect(callArgs[2]).toEqual({ merge: true });

    // Verify signup analytics was NOT called for returning user
    expect(analytics.track).not.toHaveBeenCalledWith(
      "signup_google",
      expect.anything()
    );
  });

  it("handles missing displayName by using default value", async () => {
    // Mock getDoc to return non-existent document
    const mockSnap = {
      exists: () => false,
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    // Test data with null displayName
    const userData = {
      uid: "test-uid",
      displayName: null,
      email: "test@example.com",
      emailVerified: true,
      provider: "google",
    };

    // Execute function
    await upsertUserProfile(userData);

    // Verify default displayName was used
    const callArgs = (setDoc as any).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      displayName: "Friend",
    });
  });

  it("preserves existing custom fields when updating returning user", async () => {
    // Mock getDoc to return existing document with custom fields
    const mockSnap = {
      exists: () => true,
      data: () => ({
        uid: "test-uid",
        displayName: "Existing User",
        email: "test@example.com",
        roles: { user: true, host: false, admin: false }, // Custom role
        welcomeEmailSent: true,
        country: "Australia", // Custom field
        customPreferences: { theme: "dark" }, // Custom nested field
      }),
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    // Test data for update
    const userData = {
      uid: "test-uid",
      displayName: "Updated User",
      email: "test@example.com",
      photoURL: "https://example.com/new-photo.jpg",
      emailVerified: true,
      provider: "google",
      googleDisplayName: "Updated User",
    };

    // Execute function
    await upsertUserProfile(userData);

    // Verify merge is true to preserve existing fields and timestamps are set
    const callArgs = (setDoc as any).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      updatedAt: "mocked-timestamp",
      lastLoginAt: "mocked-timestamp",
    });
    expect(callArgs[2]).toEqual({ merge: true });
  });

  it("creates profile with empty email when email is null", async () => {
    // Mock getDoc to return non-existent document
    const mockSnap = {
      exists: () => false,
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    // Test data with null email
    const userData = {
      uid: "test-uid",
      displayName: "Test User",
      email: null,
      emailVerified: false,
      provider: "google",
    };

    // Execute function
    await upsertUserProfile(userData);

    // Verify empty string email was used
    const callArgs = (setDoc as any).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      email: "",
    });

  });

  it("does not update photo metadata when no photoURL is provided", async () => {
    const mockSnap = {
      exists: () => true,
      data: () => ({
        uid: "test-uid",
        displayName: "Existing User",
        email: "test@example.com",
      }),
    };

    (getDoc as any).mockResolvedValue(mockSnap);

    const userData = {
      uid: "test-uid",
      displayName: "Existing User",
      email: "test@example.com",
      emailVerified: true,
      provider: "google",
    };

    await upsertUserProfile(userData);

    const callArgs = (setDoc as any).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty("photoURL");
    expect(callArgs[1]).not.toHaveProperty("photoUpdatedAt");
  });
  it("tracks signup_email when creating a password user", async () => {
    const mockSnap = { exists: () => false };
    (getDoc as any).mockResolvedValue(mockSnap);

    const userData = {
      uid: "password-uid",
      displayName: "Email User",
      email: "email@example.com",
      emailVerified: false,
      provider: "password",
    };

    await upsertUserProfile(userData);

    expect(analytics.track).toHaveBeenCalledWith("signup_email", {
      userId: "password-uid",
    });
  });
});
