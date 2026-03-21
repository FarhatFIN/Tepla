"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsSettingsPage() {
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
        <CardContent className="space-y-4 text-sm text-tepla-text-secondary">
          <p>Push notifications: On</p>
          <p>Sound: Default</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
