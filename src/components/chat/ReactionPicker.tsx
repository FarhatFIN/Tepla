"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export type ReactionPickerProps = {
  onSelect: (emoji: string) => void;
  className?: string;
  allowCustom?: boolean;
};

export const ReactionPicker = ({
  onSelect,
  className,
  allowCustom,
}: ReactionPickerProps) => {
  const [customEmoji, setCustomEmoji] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "space-y-2 rounded-2xl border border-tepla-border/80 bg-black/80 p-2 shadow-glass",
        className,
      )}
    >
      <div className="flex gap-1">
        {DEFAULT_EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-colors hover:bg-white/10"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      {allowCustom ? (
        <div className="flex items-center gap-2">
          <Input
            value={customEmoji}
            onChange={(event) => setCustomEmoji(event.target.value)}
            placeholder="Custom emoji"
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="subtle"
            size="sm"
            disabled={!customEmoji.trim()}
            onClick={() => {
              onSelect(customEmoji.trim());
              setCustomEmoji("");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
};
