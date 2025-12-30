import { vi } from "vitest";
import { type User } from "@/lib/auth-client";

/**
 * Create a mock for auth-client
 * This function helps create a mock for auth-client with control over the authentication state
 */
export function createAuthClientMock({
  isSignedIn = false,
  isAdmin = false,
} = {}) {
  // Default mock user data
  const mockUser = {
    uid: "test-user-id",
    displayName: "Test User",
    email: "test@example.com",
    photoURL: "https://example.com/photo.jpg",
    emailVerified: true,
    isAdmin,
    phoneNumber: null,
    isAnonymous: false,
    
    // Firebase User interface implementation
    metadata: { creationTime: "", lastSignInTime: "" },
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(() => Promise.resolve("mock-id-token")),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    providerId: "",
  } as User;

  // Mock signInWithGoogle function
  const signInWithGoogle = vi.fn().mockImplementation(() => {
    // Simulate successful login
    return Promise.resolve({
      user: mockUser,
    });
  });

  // Mock signOutUser function
  const signOutUser = vi.fn().mockImplementation(() => {
    return Promise.resolve();
  });

  // Current auth state
  let currentAuthState = isSignedIn ? mockUser : null;

  // Auth state change listeners
  const listeners: ((user: User | null) => void)[] = [];

  // Mock onAuthChange function
  const onAuthChange = vi.fn().mockImplementation((callback) => {
    listeners.push(callback);
    
    // Call callback with current auth state immediately
    setTimeout(() => {
      callback(currentAuthState);
    }, 0);
    
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  });

  // Helper function to programmatically change auth state for testing
  const changeAuthState = (newState: User | null) => {
    currentAuthState = newState;
    listeners.forEach(callback => callback(newState));
  };

  // Return mock functions and control functions
  return {
    signInWithGoogle,
    signOutUser,
    onAuthChange,
    changeAuthState,
    mockUser,
  };
}

// Default mocks for easier imports
export const signInWithGoogle = vi.fn();
export const signOutUser = vi.fn();
export const onAuthChange = vi.fn();

// Mock auth-client module
vi.mock("@/lib/auth-client", () => ({
  signInWithGoogle,
  signOutUser,
  onAuthChange,
}));