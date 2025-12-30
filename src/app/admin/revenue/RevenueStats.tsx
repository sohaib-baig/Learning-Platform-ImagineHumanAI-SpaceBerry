"use client";

interface StatItem {
  label: string;
  value: string;
}

interface RevenueStatsProps {
  stats: StatItem[];
  loading?: boolean;
}

export function RevenueStats({ stats, loading }: RevenueStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="mt-4 h-7 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
