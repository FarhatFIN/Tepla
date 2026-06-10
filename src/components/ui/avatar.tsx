import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  animated?: boolean;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, fallback, size = "md", online, animated, src, alt, ...props }, ref) => {
    const [failed, setFailed] = React.useState(false);
    const initials =
      fallback ??
      (typeof alt === "string"
        ? alt
            .split(" ")
            .map((segment) => segment[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "");

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-tepla-surface text-tepla-text-secondary ring-1 ring-tepla-border/80",
          animated && "animate-pulse ring-2 ring-sky-400/40 shadow-[0_0_24px_rgba(56,189,248,0.35)]",
          sizeClasses[size],
          className,
        )}
      >
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
            {...props}
          />
        ) : (
          <span className="font-medium">{initials}</span>
        )}

        {online ? (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-black/80 bg-tepla-online shadow-[0_0_0_2px_rgba(15,23,42,0.85)]" />
        ) : null}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

