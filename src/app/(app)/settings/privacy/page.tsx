"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacySettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-lg p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-tepla-text-secondary">
          <p>Last seen: Everyone</p>
          <p>Profile photo: Everyone</p>
          <p>Read receipts: On</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
