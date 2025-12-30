import { describe, expect, it, beforeEach } from "vitest";
import { canAccessAdmin, parseAdminWhitelist } from "../adminAccess";

describe("parseAdminWhitelist", () => {
  it("returns empty array when env is missing", () => {
    expect(parseAdminWhitelist(undefined)).toEqual([]);
    expect(parseAdminWhitelist(null)).toEqual([]);
  });

  it("splits, trims, and lowercases entries", () => {
    const env = "  ADMIN@EXAMPLE.com , admin2@example.com,, ";
    expect(parseAdminWhitelist(env)).toEqual([
      "admin@example.com",
      "admin2@example.com",
    ]);
  });
});

describe("canAccessAdmin", () => {
  const baseUser = {
    email: "admin@example.com",
    roles: { user: true, host: false, admin: true },
  };

  let whitelistEnv: string;

  beforeEach(() => {
    whitelistEnv = "admin@example.com,other@example.com";
  });

  it("denies access when whitelist env is empty", () => {
    expect(canAccessAdmin(baseUser, "")).toBe(false);
  });

  it("denies access when roles.admin is false", () => {
    expect(
      canAccessAdmin(
        { ...baseUser, roles: { user: true, host: false, admin: false } },
        whitelistEnv
      )
    ).toBe(false);
  });

  it("denies access when email not in whitelist", () => {
    expect(
      canAccessAdmin(
        { ...baseUser, email: "not-allowed@example.com" },
        whitelistEnv
      )
    ).toBe(false);
  });

  it("allows access when email is whitelisted and admin role is true", () => {
    expect(canAccessAdmin(baseUser, whitelistEnv)).toBe(true);
  });

  it("performs case-insensitive email matching", () => {
    expect(
      canAccessAdmin(
        { ...baseUser, email: "Admin@Example.com" },
        whitelistEnv
      )
    ).toBe(true);
  });
});
