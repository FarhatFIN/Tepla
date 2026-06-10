"use client";

import { Edit3, Reply, X } from "lucide-react";
import type { LocalMessage } from "@/stores/chat.store";
import { Button } from "@/components/ui/button";
import { getMessagePreview } from "@/lib/utils";

type ReplyComposerProps = {
  mode: "reply" | "edit";
  message: LocalMessage | null;
  onCancel: () => void;
};

export const ReplyComposer = ({ mode, message, onCancel }: ReplyComposerProps) => {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-2 rounded-[24px] border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-sky-300">
            {mode === "reply" ? <Reply className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            {mode === "reply" ? "Replying" : "Editing"}
          </div>
          <p className="mt-1 truncate text-sm text-white">
            {getMessagePreview(message.content, message.type, message.isDeleted)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
