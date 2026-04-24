"use client";

import { motion } from "framer-motion";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsSettingsPage() {
  const { permission, isSubscribed, enableNotifications } = useNotifications();

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-lg p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {permission === "granted" ? (
                <Bell className="h-4 w-4 text-tepla-accent" />
              ) : (
                <BellOff className="h-4 w-4 text-tepla-text-muted" />
              )}
              <div>
                <p className="font-medium text-tepla-text">Push notifications</p>
                <p className="text-xs text-tepla-text-muted">
                  {permission === "granted"
                    ? isSubscribed
                      ? "Enabled and subscribed"
                      : "Permission granted, subscribing..."
                    : permission === "denied"
                      ? "Blocked by browser. Enable in site settings."
                      : "Not enabled yet"}
                </p>
              </div>
            </div>
            {permission === "default" ? (
              <Button size="sm" onClick={enableNotifications}>
                Enable
              </Button>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-tepla-text-muted" />
              <div>
                <p className="font-medium text-tepla-text">Sound</p>
                <p className="text-xs text-tepla-text-muted">Default</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
