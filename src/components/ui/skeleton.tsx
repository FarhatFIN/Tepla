import * as React from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-xl bg-gradient-to-r from-slate-800/70 via-slate-700/60 to-slate-800/70 bg-[length:200%_100%]",
          className,
        )}
        {...props}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";

