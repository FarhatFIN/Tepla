"use client";

import { Pin } from "lucide-react";
import type { LocalMessage } from "@/stores/chat.store";
import { cn, getMessagePreview } from "@/lib/utils";

type PinnedMessagesBarProps = {
  messages: LocalMessage[];
  onSelect?: (messageId: string) => void;
  className?: string;
};

export const PinnedMessagesBar = ({
  messages,
  onSelect,
  className,
}: PinnedMessagesBarProps) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-b border-white/5 bg-white/[0.03] px-4 py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
            Pinned messages
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => onSelect?.(message.id)}
                className="min-w-[220px] max-w-[280px] rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors hover:border-sky-400/30 hover:bg-sky-500/10"
              >
                <p className="truncate text-xs font-medium text-white">
                  {getMessagePreview(message.content, message.type, message.isDeleted)}
                </p>
                <p className="mt-1 text-[11px] text-tepla-text-muted">
                  {message.replyToMessage ? "Includes reply context" : "Pinned by chat admin"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
