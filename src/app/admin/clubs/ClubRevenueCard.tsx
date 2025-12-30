interface ClubRevenueCardProps {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
}

const toneStyles: Record<
  NonNullable<ClubRevenueCardProps["tone"]>,
  { bg: string; text: string; border: string }
> = {
  slate: {
    bg: "bg-slate-50",
    text: "text-slate-900",
    border: "border-slate-200",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    border: "border-emerald-200",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
  },
};

export function ClubRevenueCard({
  label,
  value,
  tone = "slate",
}: ClubRevenueCardProps) {
  const colors = toneStyles[tone];

  return (
    <div
      className={`rounded-xl border ${colors.border} ${colors.bg} p-4 shadow-sm`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${colors.text}`}>{value}</p>
    </div>
  );
}
