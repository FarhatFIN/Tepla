import { BadgeCheck, Pin } from "lucide-react";
import { motion } from "framer-motion";
import type { TeplaChat } from "@/types/chat";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatSidebarTime } from "@/lib/utils";

type ChatListItemProps = {
  chat: TeplaChat;
  active?: boolean;
  collapsed?: boolean;
  preview?: string;
  updatedAt?: string;
  online?: boolean;
  unreadCount?: number;
  pinned?: boolean;
  onTogglePin?: () => void;
  onClick?: () => void;
};

export const ChatListItem = ({
  chat,
  active,
  collapsed,
  preview,
  updatedAt,
  online,
  unreadCount,
  pinned,
  onTogglePin,
  onClick,
}: ChatListItemProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition-colors",
        active
          ? "bg-tepla-surface text-white"
          : "text-tepla-text-secondary hover:bg-white/5",
      )}
      title={chat.name ?? chat.username ?? "Chat"}
    >
      <Avatar
        size="sm"
        src={chat.avatarUrl ?? undefined}
        alt={chat.name ?? chat.username ?? "Chat"}
        online={online}
      />
      <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <p className="truncate text-[13px] font-medium text-tepla-text">
              {chat.name ?? chat.username ?? "Chat"}
            </p>
            {chat.isVerified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            ) : null}
          </div>
          {updatedAt ? (
            <span className="shrink-0 text-[10px] text-tepla-text-muted">
              {formatSidebarTime(updatedAt)}
            </span>
          ) : null}
          {onTogglePin ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin();
              }}
            >
              <Pin className={cn("h-3.5 w-3.5", pinned ? "text-sky-300" : "text-white/45")} />
            </Button>
          ) : null}
          {unreadCount ? (
            <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-tepla-accent px-1.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          ) : null}
        </div>
        {preview || chat.description ? (
          <p className="truncate text-[11px] text-tepla-text-muted">
            {preview ?? chat.description}
          </p>
        ) : null}
        {chat.username ? (
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em] text-sky-300/80">
            @{chat.username}
          </p>
        ) : null}
      </div>
      {collapsed && unreadCount ? (
        <span className="absolute right-1 top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-tepla-accent px-1.5 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </motion.button>
  );
};
