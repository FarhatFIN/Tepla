"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === "/settings";

  return (
    <div className="flex h-full flex-col bg-tepla-bg-secondary/40">
      <header className="flex items-center gap-2 border-b border-tepla-border/70 px-4 py-2.5">
        <Button variant="ghost" size="icon" asChild>
          <Link href={isRoot ? "/" : "/settings"} aria-label={isRoot ? "Back to chats" : "Back to settings"}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h2 className="text-sm font-semibold text-tepla-text">
          {isRoot ? "Settings" : "Settings"}
        </h2>
      </header>
      {children}
    </div>
  );
}
