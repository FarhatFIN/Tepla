import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, onRightIconClick, ...props }, ref) => {
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
            "tepla-field h-10 shadow-sm",
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
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-2 flex items-center justify-center rounded-lg bg-transparent px-1 text-tepla-text-muted hover:text-tepla-text tepla-interactive"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

