import React from "react";

interface FormRowProps {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormRow({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
}: FormRowProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-1">{children}</div>
      {description && (
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

