"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  clickable = false,
  onClick,
}: CardProps) {
  const baseClasses =
    "rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8";
  const interactiveClasses = clickable
    ? "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 transition cursor-pointer"
    : "";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!clickable || !onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const clickableProps = clickable
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
      }
    : {
        onClick,
      };

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`} {...clickableProps}>
      {children}
    </div>
  );
}
