// components/assist/FloatingActionButton.tsx
"use client";
import React from "react";

export default function FloatingActionButton({
  children,
  onClick,
  size = "md",
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
}) {
  const dims = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => { e.preventDefault(); onClick?.(); }}
      className={`inline-flex items-center justify-center rounded-full ${dims} border border-white/12 bg-white/6 backdrop-blur-sm text-white/95 shadow-sm ${className} active:scale-95 transition-transform`}
    >
      {children}
    </button>
  );
}
