/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInClient } from "../SignInClient";
import {
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmail,
  sendPasswordReset,
} from "@/lib/auth-client";
import { analytics } from "@/lib/analytics";

// Mock dependencies
vi.mock("@/lib/auth-client", () => ({
  signInWithGoogle: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  analytics: {
    track: vi.fn(),
  },
}));

vi.mock("next/font/google", () => ({
  Poppins: () => ({ className: "mocked-font" }),
}));

// Create a mock router implementation
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  pathname: "/",
};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock Card component for simpler testing
vi.mock("@/components/Card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

describe("SignIn Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset the mock router
    mockRouter.push.mockReset();
  });

  it("renders the current sign-in layout", () => {
    render(<SignInClient />);

    expect(screen.getByText("Imagine Humans")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your space")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("calls signInWithGoogle when button is clicked", async () => {
    // Mock successful sign-in
    (signInWithGoogle as any).mockResolvedValue({});

    render(<SignInClient />);

    // Find and click the Google sign-in button
    const signInButton = screen.getByText("Google");
    fireEvent.click(signInButton);

    // Verify loading state is shown
    expect(screen.getByText("Signing in...")).toBeInTheDocument();

    // Wait for the promise to resolve
    await waitFor(() => {
      // Verify signInWithGoogle was called
      expect(signInWithGoogle).toHaveBeenCalled();
    });
  });

  it("redirects to onboarding for new Google users", async () => {
    // Mock successful sign-in
    (signInWithGoogle as any).mockResolvedValue({});

    render(<SignInClient />);

    // Find and click the Google sign-in button
    const signInButton = screen.getByText("Google");
    fireEvent.click(signInButton);

    // Wait for the promise to resolve
    await waitFor(() => {
      // New users without metadata get routed to onboarding start
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding/start");

      // Verify analytics event was tracked
      expect(analytics.track).toHaveBeenCalledWith("signin_google");
    });
  });

  it("disables the button during sign-in process", async () => {
    // Mock slow sign-in (don't resolve immediately)
    const signInPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 100);
    });
    (signInWithGoogle as any).mockReturnValue(signInPromise);

    render(<SignInClient />);

    // Find and click the Google sign-in button
    const signInButton = screen.getByText("Google").closest("button");
    fireEvent.click(signInButton!);

    // Verify button is disabled during sign-in process
    expect(signInButton).toBeDisabled();

    // Wait for the promise to resolve
    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled();
    });
  });

  it("submits email/password sign-in form", async () => {
    (signInWithEmailPassword as any).mockResolvedValue({});

    render(<SignInClient />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(signInWithEmailPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("switches to signup mode and calls signUpWithEmail", async () => {
    (signUpWithEmail as any).mockResolvedValue({});

    render(<SignInClient />);

    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith({
        name: "Test User",
        email: "new@example.com",
        password: "password123",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/onboarding/start");
    });
  });

  it("shows validation error when sending password reset without email", async () => {
    render(<SignInClient />);

    fireEvent.click(screen.getByText("Forgot Password?"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Enter your email so we know where to send the reset link."
        )
      ).toBeInTheDocument();
      expect(sendPasswordReset).not.toHaveBeenCalled();
    });
  });
});
