"use client";
import { cn } from "@/lib/cn";

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
        active
          ? "bg-[color:var(--text)] text-white"
          : "bg-white border border-[color:var(--border)] text-[color:var(--text-muted)]",
        className
      )}
    >
      {children}
    </button>
  );
}
