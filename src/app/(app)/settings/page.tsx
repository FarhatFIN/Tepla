"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  ChevronRight,
  User,
  Bell,
  Shield,
  Palette,
  Smartphone,
  PhoneCall,
} from "lucide-react";

const items = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/communications", label: "Calls & Media", icon: PhoneCall },
  { href: "/settings/sessions", label: "Active Sessions", icon: Smartphone },
];

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-lg"
      >
        <h1 className="mb-4 text-lg font-semibold text-tepla-text">Settings</h1>
        <Card className="divide-y divide-tepla-border/60">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-tepla-text-muted" />
                  <span className="text-sm text-tepla-text">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-tepla-text-muted" />
              </div>
            </Link>
          ))}
        </Card>
      </motion.div>
    </div>
  );
}
