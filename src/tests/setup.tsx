/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Restore mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Mock Next.js components
vi.mock("next/link", () => ({
  default: ({ href, children }: any) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) => (
    <img alt={alt ?? ""} {...props} />
  )
}));

// Mock server-only helper for Vitest environment
vi.mock("server-only", () => ({}));

// Mock Firebase
vi.mock("../lib/firebase", () => ({
  app: {},
  db: {},
  auth: {
    onAuthStateChanged: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
  },
  storage: {},
  googleProvider: {},
}));

// Mock analytics
vi.mock("../lib/analytics", () => ({
  analytics: {
    track: vi.fn(),
    init: vi.fn(),
    setUserId: vi.fn(),
  },
  trackEvent: vi.fn(),
}));

// Mock Next.js hooks
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/",
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Add window.location mutation safe helpers
class LocationMock {
  private _href: string = "http://localhost";

  get hostname(): string {
    return new URL(this._href).hostname;
  }

  get pathname(): string {
    return new URL(this._href).pathname;
  }

  get search(): string {
    return new URL(this._href).search;
  }

  get href(): string {
    return this._href;
  }

  set href(value: string) {
    this._href = value;
  }

  assign(url: string): void {
    this._href = url;
  }
  
  replace(url: string): void {
    this._href = url;
  }
}

Object.defineProperty(window, 'location', {
  value: new LocationMock(),
  writable: true,
});

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "test-app-id";
process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = "test-amplitude-key";
process.env.NEXT_PUBLIC_MUX_ENV_KEY = "test-mux-key";
process.env.POSTMARK_SERVER_TOKEN = "test-postmark-token";
