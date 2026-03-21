import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both";
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    const overflowY =
      orientation === "vertical" || orientation === "both"
        ? "overflow-y-auto"
        : "overflow-y-hidden";
    const overflowX =
      orientation === "horizontal" || orientation === "both"
        ? "overflow-x-auto"
        : "overflow-x-hidden";

    return (
      <div
        ref={ref}
        className={cn(
          "tepla-scrollbar relative h-full w-full",
          overflowX,
          overflowY,
          className,
        )}
        {...props}
      />
    );
  },
);

ScrollArea.displayName = "ScrollArea";

