import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-tepla-border/70 px-4 py-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h2 className="text-sm font-medium text-tepla-text">Settings</h2>
      </header>
      {children}
    </div>
  );
}
