"use client";

import { motion } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Palette,
  HardDrive,
  Languages,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SettingsSectionLink } from "@/components/settings/SettingsSectionLink";
import { useAuthStore } from "@/stores/auth.store";
import { Avatar } from "@/components/ui/avatar";

const sections = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/privacy", label: "Privacy & Security", icon: Shield },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/data", label: "Data & Storage", icon: HardDrive },
  { href: "/settings/language", label: "Language", icon: Languages },
] as const;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto w-full max-w-lg space-y-4"
      >
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl border border-tepla-border/70 bg-tepla-surface px-4 py-3">
            <Avatar
              size="md"
              src={user.avatarUrl ?? undefined}
              alt={user.displayName ?? user.username}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-tepla-text">
                {user.displayName ?? user.username}
              </p>
              <p className="truncate text-xs text-tepla-text-muted">@{user.username}</p>
            </div>
          </div>
        ) : null}

        <Card className="divide-y divide-tepla-border/60 overflow-hidden p-0">
          {sections.map((item) => (
            <SettingsSectionLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </Card>
      </motion.div>
    </div>
  );
}
