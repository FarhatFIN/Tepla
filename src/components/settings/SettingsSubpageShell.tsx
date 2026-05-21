"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

type SettingsSubpageShellProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSubpageShell({ title, children }: SettingsSubpageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-auto"
    >
      <div className="border-b border-tepla-border/70 px-4 py-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm font-medium text-tepla-accent transition-colors duration-200 hover:text-tepla-accent-hover"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{title}</span>
        </Link>
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 p-4">{children}</div>
    </motion.div>
  );
}
