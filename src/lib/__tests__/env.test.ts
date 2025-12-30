import { describe, it, expect, vi, afterEach } from "vitest";

// Save the original env to restore after tests
const originalEnv = { ...process.env };

describe("Environment Variables", () => {
  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
    
    // Clear the module cache to force reloading env.ts
    vi.resetModules();
    
    // Remove any env stubs
    vi.unstubAllEnvs();
  });
  
  it("should parse all environment variables correctly when valid", async () => {
    // Set environment variables for the test
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "test-bucket");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app-id");
    vi.stubEnv("NEXT_PUBLIC_AMPLITUDE_API_KEY", "test-amplitude-key");
    vi.stubEnv("NEXT_PUBLIC_MUX_ENV_KEY", "test-mux-key");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SEED_DATA", "true");
    
    // Import the module after env vars are set
    const { env, HAS_AMPLITUDE, HAS_MUX_ENV } = await import("../env");
    
    // Check if all variables are parsed correctly
    expect(env.NEXT_PUBLIC_FIREBASE_API_KEY).toBe("test-api-key");
    expect(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).toBe("test.firebaseapp.com");
    expect(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe("test-project");
    expect(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).toBe("test-bucket");
    expect(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID).toBe("123456");
    expect(env.NEXT_PUBLIC_FIREBASE_APP_ID).toBe("test-app-id");
    expect(env.NEXT_PUBLIC_AMPLITUDE_API_KEY).toBe("test-amplitude-key");
    expect(env.NEXT_PUBLIC_MUX_ENV_KEY).toBe("test-mux-key");
    expect(env.NEXT_PUBLIC_ENABLE_SEED_DATA).toBe(true);
    
    // Check convenience booleans
    expect(HAS_AMPLITUDE).toBe(true);
    expect(HAS_MUX_ENV).toBe(true);
  });
  
  it("should throw an error when required Firebase variables are missing", async () => {
    // Missing NEXT_PUBLIC_FIREBASE_API_KEY
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "test-bucket");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app-id");
    
    // Capture console.error to prevent it from polluting test output
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Test that importing the module throws an error
    await expect(import("../env")).rejects.toThrow();
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
  
  it("should handle optional Amplitude key correctly", async () => {
    // Set required variables
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "test-bucket");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app-id");
    
    // Optional variables
    vi.stubEnv("NEXT_PUBLIC_AMPLITUDE_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_MUX_ENV_KEY", "");
    
    // Import the module
    const { env, HAS_AMPLITUDE, HAS_MUX_ENV } = await import("../env");
    
    // Check that the optional variables use default values
    expect(env.NEXT_PUBLIC_AMPLITUDE_API_KEY).toBe("");
    expect(env.NEXT_PUBLIC_MUX_ENV_KEY).toBe("");
    
    // Check convenience booleans
    expect(HAS_AMPLITUDE).toBe(false);
    expect(HAS_MUX_ENV).toBe(false);
  });
  
  it("should convert NEXT_PUBLIC_ENABLE_SEED_DATA string to boolean", async () => {
    // Set required variables
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "test-bucket");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app-id");
    
    // Test with "true" string
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SEED_DATA", "true");
    let { env } = await import("../env");
    expect(env.NEXT_PUBLIC_ENABLE_SEED_DATA).toBe(true);
    
    // Reset module cache
    vi.resetModules();
    
    // Test with "false" string
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SEED_DATA", "false");
    ({ env } = await import("../env"));
    expect(env.NEXT_PUBLIC_ENABLE_SEED_DATA).toBe(false);
    
    // Reset module cache
    vi.resetModules();
    
    // Test with undefined
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SEED_DATA", undefined);
    ({ env } = await import("../env"));
    expect(env.NEXT_PUBLIC_ENABLE_SEED_DATA).toBe(false);
  });
});