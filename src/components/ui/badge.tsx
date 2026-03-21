import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "outline"
  | "success"
  | "danger"
  | "muted";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClassName: Record<BadgeVariant, string> = {
      default:
        "bg-tepla-accent/90 text-white border border-tepla-accent/80 shadow-sm shadow-tepla-accent/40",
      outline:
        "border border-tepla-border/90 bg-black/40 text-tepla-text-secondary",
      success:
        "bg-emerald-500/90 text-white border border-emerald-400/80 shadow-sm shadow-emerald-500/40",
      danger:
        "bg-tepla-danger/90 text-white border border-tepla-danger/80 shadow-sm shadow-tepla-danger/40",
      muted:
        "bg-tepla-surface text-tepla-text-muted border border-tepla-border/70",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none",
          variantClassName[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

