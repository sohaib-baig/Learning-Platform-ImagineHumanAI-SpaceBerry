import type { UserRoles } from "@/types/club";

/**
 * Parse the admin whitelist from env, trimming entries and lowercasing emails.
 * Returns an empty array if no env is provided.
 */
export function parseAdminWhitelist(envValue?: string | null): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Determine if the user may access admin pages, requiring BOTH roles.admin and
 * inclusion in the whitelist. An empty whitelist denies access by default.
 */
export function canAccessAdmin(
  user: { email?: string | null; roles?: UserRoles | null },
  whitelistEnv?: string | null
): boolean {
  const whitelist = parseAdminWhitelist(whitelistEnv);
  if (whitelist.length === 0) {
    return false;
  }

  if (!user?.roles?.admin) {
    return false;
  }

  const email = user?.email?.toLowerCase() ?? "";
  return whitelist.includes(email);
}
