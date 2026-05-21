import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[80px] w-full resize-none rounded-2xl border border-tepla-border/80 bg-black/40 px-3 py-2 text-sm text-tepla-text placeholder:text-tepla-text-muted shadow-sm outline-none transition-colors focus-visible:border-tepla-accent focus-visible:ring-2 focus-visible:ring-tepla-accent/60 focus-visible:ring-offset-0",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

