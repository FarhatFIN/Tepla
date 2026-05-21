import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSectionLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
};

export function SettingsSectionLink({
  href,
  label,
  icon: Icon,
  description,
  className,
}: SettingsSectionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-tepla-surface-hover",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tepla-accent/15 text-tepla-accent">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-tepla-text">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-xs text-tepla-text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-tepla-text-muted" />
    </Link>
  );
}
