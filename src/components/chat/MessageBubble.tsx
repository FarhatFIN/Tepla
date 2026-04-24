"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  CornerUpLeft,
  Lock,
  Pencil,
  Pin,
  Languages,
  Sparkles,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import type { LocalMessage } from "@/stores/chat.store";
import { Button } from "@/components/ui/button";
import { ReactionPicker } from "./ReactionPicker";
import { cn, formatMessageTime, getMessagePreview } from "@/lib/utils";

type MessageBubbleProps = {
  message: LocalMessage;
  isOwn: boolean;
  canPin: boolean;
  onReply: (message: LocalMessage) => void;
  onEdit: (message: LocalMessage) => void;
  onDelete: (message: LocalMessage) => void;
  onTogglePin: (message: LocalMessage) => void;
  onToggleReaction: (message: LocalMessage, emoji: string, hasReacted: boolean) => void;
  canSendSparks?: boolean;
  onSendSparks?: (message: LocalMessage) => void;
};

const statusIconByState = {
  sending: <Check className="h-3 w-3 opacity-50" />,
  sent: <Check className="h-3 w-3" />,
  delivered: <CheckCheck className="h-3 w-3" />,
  read: <CheckCheck className="h-3 w-3 text-sky-400" />,
  error: <AlertCircle className="h-3 w-3 text-red-400" />,
};

const renderAttachment = (message: LocalMessage) => {
  const primaryAttachment = message.attachments[0];

  if (!primaryAttachment) {
    return null;
  }

  if (message.type === "voice" || message.type === "audio") {
    return (
      <audio
        controls
        src={primaryAttachment.url}
        className="mt-2 h-10 w-full rounded-2xl"
      />
    );
  }

  if (message.type === "sticker") {
    return (
      <div className="mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryAttachment.url}
          alt={primaryAttachment.fileName ?? "Sticker"}
          className="h-32 w-32 rounded-3xl object-cover"
        />
      </div>
    );
  }

  return (
    <a
      href={primaryAttachment.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/85 transition-colors hover:border-sky-400/30"
    >
      {primaryAttachment.fileName ?? "Open attachment"}
    </a>
  );
};

export const MessageBubble = ({
  message,
  isOwn,
  canPin,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
  canSendSparks,
  onSendSparks,
}: MessageBubbleProps) => {
  const [isReactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const animations = {
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
  };
  const authUser = useAuthStore((state) => state.user);

  const preview = getMessagePreview(message.content, message.type, message.isDeleted);
  const isEncrypted = Boolean(message.contentIv || message.encryptedKeys);
  const canEdit = isOwn && message.type === "text" && message.attachments.length === 0;
  const canDelete = isOwn || canPin;
  const canTranslate = Boolean(message.type === "text" && message.content);
  const allowCustomReactions = true;
  const sparkCount = message.sparkCount ?? 0;
  const sparkSendersCount = message.sparkSendersCount ?? 0;

  return (
    <motion.div
      className={cn(
        "group flex w-full flex-col gap-2 px-3",
        isOwn ? "items-end" : "items-start",
      )}
      initial={animations.initial}
      animate={animations.animate}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div
        className={cn(
          "max-w-[82%] rounded-[24px] px-3 py-2.5 text-sm leading-relaxed shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
          isOwn
            ? "rounded-br-md bg-[linear-gradient(180deg,rgba(108,99,255,1),rgba(79,70,229,0.92))] text-white"
            : "rounded-bl-md border border-white/5 bg-[linear-gradient(180deg,rgba(30,34,53,0.94),rgba(18,24,38,0.9))] text-tepla-text",
        )}
      >
        {(message.isPinned || isEncrypted || message.isEdited) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/60">
            {message.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            ) : null}
            {isEncrypted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                <Lock className="h-3 w-3" />
                Private
              </span>
            ) : null}
            {message.isEdited ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                Edited
              </span>
            ) : null}
          </div>
        )}

        {message.replyToMessage ? (
          <button
            type="button"
            onClick={() => onReply(message)}
            className="mb-2 block w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-sky-300">Reply</p>
            <p className="mt-1 truncate text-xs text-white/85">
              {getMessagePreview(
                message.replyToMessage.content,
                message.replyToMessage.type,
                message.replyToMessage.isDeleted,
              )}
            </p>
          </button>
        ) : null}

        {message.content ? <p className="whitespace-pre-wrap break-words">{preview}</p> : null}
        {renderAttachment(message)}
        {translatedText ? (
          <div className="mt-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-50">
            {translatedText}
          </div>
        ) : null}

        <div
          className={cn(
            "mt-2 flex items-center gap-1.5 text-[11px]",
            isOwn ? "justify-end text-white/70" : "justify-end text-tepla-text-muted",
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn ? statusIconByState[message.status] : null}
        </div>
      </div>

      {message.reactions.length > 0 ? (
        <div
          className={cn(
            "flex max-w-[82%] flex-wrap gap-1",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() =>
                onToggleReaction(
                  message,
                  reaction.emoji,
                  Boolean(reaction.reactedByCurrentUser),
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                reaction.reactedByCurrentUser
                  ? "animate-pulse border-sky-400/40 bg-sky-500/10 text-sky-200"
                  : "border-white/10 bg-white/[0.04] text-white/80",
              )}
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
        </div>
      ) : null}

      {sparkCount > 0 ? (
        <div
          className={cn(
            "flex max-w-[82%] flex-wrap gap-1",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100">
            <Sparkles className="h-3.5 w-3.5" />
            {sparkCount} sparks
            {sparkSendersCount > 0
              ? ` - ${sparkSendersCount} supporter${sparkSendersCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "flex max-w-[82%] flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
          isOwn ? "justify-end" : "justify-start",
        )}
      >
        <Button type="button" variant="ghost" size="sm" onClick={() => onReply(message)}>
          <CornerUpLeft className="h-3.5 w-3.5" />
          Reply
        </Button>
        {canEdit ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(message)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
        {canPin ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onTogglePin(message)}>
            <Pin className="h-3.5 w-3.5" />
            {message.isPinned ? "Unpin" : "Pin"}
          </Button>
        ) : null}
        {canTranslate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isTranslating}
            onClick={async () => {
              try {
                setIsTranslating(true);
                const response = await fetch("/api/ai", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "translate",
                    payload: [message.content, authUser?.language ?? "en"],
                  }),
                });

                if (!response.ok) {
                  throw new Error("Failed to translate message.");
                }

                const payload = (await response.json()) as { translation: string };
                setTranslatedText(payload.translation);
              } catch {
                setTranslatedText("Translation is unavailable right now.");
              } finally {
                setIsTranslating(false);
              }
            }}
          >
            <Languages className="h-3.5 w-3.5" />
            {isTranslating ? "Translating..." : "Translate"}
          </Button>
        ) : null}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReactionPickerOpen((current) => !current)}
          >
            <SmilePlus className="h-3.5 w-3.5" />
            React
          </Button>
          {isReactionPickerOpen ? (
            <ReactionPicker
              className={cn(
                "absolute top-full z-10 mt-2",
                isOwn ? "right-0" : "left-0",
              )}
              allowCustom={allowCustomReactions}
              onSelect={(emoji) => {
                const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
                onToggleReaction(
                  message,
                  emoji,
                  Boolean(existing?.reactedByCurrentUser),
                );
                setReactionPickerOpen(false);
              }}
            />
          ) : null}
        </div>
        {canSendSparks && !isOwn && onSendSparks ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onSendSparks(message)}>
            <Sparkles className="h-3.5 w-3.5" />
            Send sparks
          </Button>
        ) : null}
        {canDelete ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(message)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
};
