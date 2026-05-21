"use client";

import { motion } from "framer-motion";
import { CommunicationsLab } from "@/components/calls/CommunicationsLab";

export default function CommunicationsSettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col overflow-auto"
    >
      <CommunicationsLab />
    </motion.div>
  );
}
