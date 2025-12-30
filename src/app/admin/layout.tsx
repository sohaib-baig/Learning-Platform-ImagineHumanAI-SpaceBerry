import type { ReactNode } from "react";
import { requireAdminUser } from "@/lib/server/adminGuard";
import { canAccessAdmin } from "@/lib/server/adminAccess";
import { AdminTabs } from "./_components/AdminTabs";
import { AdminTopActions } from "./_components/AdminTopActions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Guard access on the server before rendering anything client-side.
  try {
    const adminUser = await requireAdminUser();

    // Additional email whitelist check (defense-in-depth).
    const whitelistEnv = process.env.NEXT_PUBLIC_ADMIN_WHITELIST ?? null;
    const isAllowed = canAccessAdmin(
      { email: adminUser.email, roles: adminUser.roles },
      whitelistEnv
    );

    if (!isAllowed) {
      throw new Error("Email not whitelisted for admin access");
    }
  } catch (error) {
    console.error("[admin layout] admin access denied", error);
    return (
      <html>
        <body className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_35%)]" />
          <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
            <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                Access denied
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                You are not authorised to access this page.
              </h1>
              <p className="mt-3 text-sm text-white/70">
                Contact an ImagineHumans admin if you believe this is an error.
              </p>
              <div className="mt-6">
                <a
                  href="/your-clubs"
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/25"
                >
                  Go to your clubs
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  console.log("[admin layout] admin access granted");

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.18),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_35%,rgba(255,255,255,0.06)_70%,rgba(255,255,255,0.02)_100%)] opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">
                    ImagineHumans
                  </p>
                  <p className="text-xl font-semibold">Admin Panel</p>
                </div>
              </div>

              <div className="mt-6">
                <AdminTabs />
              </div>

              <div className="mt-6">
                <AdminTopActions />
              </div>
            </div>
          </aside>

          <main className="rounded-3xl border border-white/20 bg-white/70 p-6 text-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
