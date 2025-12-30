import React from "react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  fullWidth = false,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-brand text-white hover:opacity-90 rounded-xl px-4 py-2
        flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-opacity
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
