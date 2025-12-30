"use client";

import type { UserProfile } from "@/lib/auth-profile";

interface UserDetailCardProps {
  profile: UserProfile;
}

function formatDate(value?: unknown) {
  if (!value) return "—";
  if (
    value &&
    typeof value === "object" &&
    "toDate" in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return "—";
}

export function UserDetailCard({ profile }: UserDetailCardProps) {
  const roles = profile.roles || { user: false, host: false, admin: false };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            User profile
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            {profile.displayName || "Unknown user"}
          </h2>
          <p className="text-sm text-slate-600">{profile.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roles.user && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Member
            </span>
          )}
          {roles.host && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Host
            </span>
          )}
          {roles.admin && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Admin
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Detail label="Created" value={formatDate(profile.createdAt)} />
        <Detail label="Last login" value={formatDate(profile.lastLoginAt)} />
        <Detail
          label="Clubs joined"
          value={String(profile.clubsJoined?.length ?? 0)}
        />
        <Detail
          label="Clubs hosted"
          value={String(profile.clubsHosted?.length ?? 0)}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
