import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
