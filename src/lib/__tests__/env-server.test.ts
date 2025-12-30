import { describe, it, expect, vi, afterEach } from "vitest";

const originalEnv = { ...process.env };

describe("Server Environment Variables", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("parses server env variables when valid", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "postmark-token");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_A", "price_a");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_B", "price_b");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_C", "price_c");

    const { serverEnv } = await import("../env-server");

    expect(serverEnv.POSTMARK_SERVER_TOKEN).toBe("postmark-token");
    expect(serverEnv.STRIPE_SECRET_KEY).toBe("sk_test_123");
    expect(serverEnv.STRIPE_PRICE_ID_TIER_A).toBe("price_a");
  });

  it("throws when required stripe secrets are missing", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "postmark-token");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_A", "price_a");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_B", "price_b");
    vi.stubEnv("STRIPE_PRICE_ID_TIER_C", "price_c");

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(import("../env-server")).rejects.toThrow(
      "Invalid server environment variables",
    );

    consoleErrorSpy.mockRestore();
  });
});
