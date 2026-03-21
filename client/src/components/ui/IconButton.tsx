"use client";
import { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
  variant?: "ghost" | "filled" | "danger";
  size?: "sm" | "md" | "lg";
  badge?: number;
}

const variants = {
  ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
  filled: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
  danger: "text-red-400 hover:bg-red-500/10",
};

const sizeClasses = { sm: "p-1.5", md: "p-2", lg: "p-2.5" };

export default function IconButton({ label, children, variant = "ghost", size = "md", badge, className = "", ...props }: IconButtonProps) {
  return (
    <button aria-label={label} className={`relative flex items-center justify-center rounded-lg transition-colors ${variants[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
