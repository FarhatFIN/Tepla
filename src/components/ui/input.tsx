import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center justify-center text-tepla-text-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-9 w-full rounded-full border border-tepla-border/80 bg-black/40 px-3 text-sm text-tepla-text placeholder:text-tepla-text-muted shadow-sm outline-none transition-colors focus-visible:border-tepla-accent focus-visible:ring-2 focus-visible:ring-tepla-accent/60 focus-visible:ring-offset-0",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full bg-transparent px-1 text-tepla-text-muted hover:text-tepla-text"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

