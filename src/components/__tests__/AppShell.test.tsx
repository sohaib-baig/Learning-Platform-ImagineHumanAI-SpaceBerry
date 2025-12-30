/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "../AppShell";
import { signOutUser, onAuthChange } from "@/lib/auth-client";

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
  signOutUser: vi.fn().mockResolvedValue(undefined),
  onAuthChange: vi.fn(),
  User: {} as any,
}));

const { mockReplace, mockUsePathname, mockUseSearchParams, mockUseOnboardingProgress } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockUsePathname: vi.fn(() => "/club/mock"),
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
  mockUseOnboardingProgress: vi.fn(() => ({
    onboarding: null,
    loading: false,
    error: null,
  })),
}));

// Mock next/navigation hooks
vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: mockUseSearchParams,
}));

vi.mock("firebase/firestore", () => {
  const mockGetDocs = vi.fn(async () => ({ empty: true, docs: [] }));
  return {
    collection: vi.fn(() => ({})),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    getDocs: mockGetDocs,
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(async () => ({ exists: () => false })),
    documentId: vi.fn(),
  };
});

vi.mock("@/hooks/useOnboardingProgress", () => ({
  useOnboardingProgress: mockUseOnboardingProgress,
}));

describe("AppShell Component", () => {
  const mockChildContent = "Mock Child Content";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/club/mock");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseOnboardingProgress.mockReturnValue({
      onboarding: null,
      loading: false,
      error: null,
    });
  });

  it("renders signed-out navigation state", () => {
    // Setup mock auth state change callback with null user (signed out)
    (onAuthChange as any).mockImplementation((callback) => {
      callback(null);
      return vi.fn(); // Return mock unsubscribe function
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByLabelText("User menu")).not.toBeInTheDocument();
    expect(screen.getByText(mockChildContent)).toBeInTheDocument();
  });

  it("renders user menu when signed in", () => {
    // Mock signed in user
    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: null,
      isAdmin: false,
    };

    // Setup mock auth state change callback with signed in user
    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn(); // Return mock unsubscribe function
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    expect(screen.getByText("Your clubs")).toBeInTheDocument();
    const userMenuButton = screen.getByLabelText("User menu");
    fireEvent.click(userMenuButton);
    expect(screen.getAllByText("Sign out")[0]).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("shows admin link only for admin users", () => {
    // Mock signed in admin user
    const mockAdminUser = {
      uid: "admin-uid",
      displayName: "Admin User",
      email: "admin@example.com",
      photoURL: null,
      isAdmin: true,
    };

    // Setup mock auth state change callback with admin user
    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockAdminUser);
      return vi.fn(); // Return mock unsubscribe function
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    // Open the user menu
    const userMenuButton = screen.getByLabelText("User menu");
    fireEvent.click(userMenuButton);
    
    // Verify Admin link is present
    expect(screen.getAllByText("Admin")[0]).toBeInTheDocument();
  });

  it("redirects completed users away from onboarding without resume flag", () => {
    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
    };

    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn();
    });

    mockUsePathname.mockReturnValue("/onboarding/host/club-name");
    mockUseOnboardingProgress.mockReturnValue({
      onboarding: {
        completedAt: "2024-01-01",
      },
      loading: false,
      error: null,
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    expect(mockReplace).toHaveBeenCalledWith("/your-clubs");
  });

  it("allows host resume flow without resume flag when host progress is active", () => {
    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
    };

    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn();
    });

    mockUsePathname.mockReturnValue("/onboarding/host/club-name");
    mockUseOnboardingProgress.mockReturnValue({
      onboarding: {
        completedAt: "2024-01-01",
        progress: { currentStep: "host:club-name" },
        hostStatus: {},
      },
      loading: false,
      error: null,
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows pending host activation banner with resume link", () => {
    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
    };

    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn();
    });

    mockUseOnboardingProgress.mockReturnValue({
      onboarding: {
        progress: { currentStep: "host:select-plan" },
        hostStatus: {
          pendingActivation: true,
          activated: false,
        },
      },
      loading: false,
      error: null,
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    expect(
      screen.getByText("Finish Stripe checkout to unlock your host tools.")
    ).toBeInTheDocument();
    const resumeLink = screen.getByRole("link", { name: /Resume checkout/i });
    expect(resumeLink).toHaveAttribute(
      "href",
      "/onboarding/host/select-plan?resume=true"
    );
  });

  it("signs out user and redirects to home when clicking sign out", async () => {
    // Save original window.location
    const originalLocation = window.location;
    
    // Setup mock location
    const mockLocation = { href: "http://localhost/dashboard" };
    Object.defineProperty(window, "location", { value: mockLocation, writable: true });
    
    // Mock signed in user
    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
    };

    // Setup mock auth state change callback with signed in user
    (onAuthChange as any).mockImplementation((callback) => {
      callback(mockUser);
      return vi.fn();
    });

    render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    // Open the user menu
    const userMenuButton = screen.getByLabelText("User menu");
    fireEvent.click(userMenuButton);
    
    // Click the first sign out button (from dropdown)
    const signOutButtons = screen.getAllByText("Sign out");
    fireEvent.click(signOutButtons[0]);
    
    // Verify signOutUser was called
    expect(signOutUser).toHaveBeenCalled();
    
    // Wait for promises to resolve
    await vi.waitFor(() => {
      // Verify redirection to homepage
      expect(mockLocation.href).toBe("/");
    });
    
    // Restore original location
    Object.defineProperty(window, "location", { value: originalLocation });
  });

  it("unsubscribes from auth changes on unmount", () => {
    // Setup mock unsubscribe function
    const mockUnsubscribe = vi.fn();
    (onAuthChange as any).mockImplementation(() => mockUnsubscribe);

    const { unmount } = render(
      <AppShell>
        <div>{mockChildContent}</div>
      </AppShell>
    );

    // Unmount component
    unmount();
    
    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});