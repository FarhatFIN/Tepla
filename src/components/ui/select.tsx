import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-3xl border border-tepla-border/80 bg-black/40 px-3 text-sm text-tepla-text shadow-sm outline-none transition-colors focus-visible:border-tepla-accent focus-visible:ring-2 focus-visible:ring-tepla-accent/60 focus-visible:ring-offset-0",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";
