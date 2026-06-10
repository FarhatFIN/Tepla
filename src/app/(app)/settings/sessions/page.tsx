"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SessionsSettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-lg p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-tepla-border/70 bg-black/40 p-3">
            <p className="text-sm font-medium text-tepla-text">This device</p>
            <p className="text-xs text-tepla-text-muted">Current session</p>
          </div>
          <Button variant="outline" className="w-full">
            Log out other sessions
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
