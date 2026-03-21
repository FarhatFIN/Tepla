"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, Paperclip, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatId } from "@/types/chat";
import type { MessageType } from "@/types/message";
import type { LocalMessage } from "@/stores/chat.store";
import { useMessages } from "@/hooks/useMessages";
import { useAuthStore } from "@/stores/auth.store";
import { ReplyComposer } from "./ReplyComposer";
import { StickerStudio, type SavedSticker } from "./StickerStudio";
import { VoiceRecorder, type VoiceRecording } from "./VoiceRecorder";

type MessageInputProps = {
  chatId: ChatId | null;
  replyToMessage: LocalMessage | null;
  editingMessage: LocalMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
};

const generalPrompts = [
  {
    label: "Launch update",
    value: "Launch update:\n- Shipped:\n- Blockers:\n- Next:\n",
  },
  {
    label: "Standup",
    value: "Standup:\nYesterday:\nToday:\nNeed help with:\n",
  },
  {
    label: "Polish copy",
    value: "Rewrite this so it sounds sharper and more premium:\n",
  },
];

const aiPrompts = [
  {
    label: "Summarize thread",
    value: "Give me a concise summary of the current product direction.",
  },
  {
    label: "Launch note",
    value: "Draft a short launch update for the team.",
  },
  {
    label: "New headline",
    value: "Give me a stronger product headline for Tepla.",
  },
];

const uploadVoiceRecording = async (recording: VoiceRecording, userId: string) => {
  const file = new File([recording.blob], recording.fileName, {
    type: recording.mimeType,
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "voice");
  formData.append("userId", userId);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to upload voice message.");
  }

  return (await response.json()) as {
    url: string;
    path: string;
    mimeType: string;
    sizeBytes: number;
    fileName: string;
  };
};

const detectFileMessageType = (file: File): MessageType => {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

export const MessageInput = ({
  chatId,
  replyToMessage,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: MessageInputProps) => {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const authUser = useAuthStore((state) => state.user);
  const { sendMessage, sendTyping, editMessage, demoMode, currentUserId } = useMessages(chatId);
  const isPremium = Boolean(authUser?.isPremium);

  useEffect(() => {
    if (editingMessage) {
      setDraft(editingMessage.content);
      setError(null);
      return;
    }

    setDraft("");
  }, [editingMessage]);

  useEffect(() => {
    if (!composerRef.current) {
      return;
    }

    composerRef.current.style.height = "0px";
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 160)}px`;
  }, [draft]);

  const resetComposer = () => {
    setDraft("");
    setError(null);
    onCancelReply();
    onCancelEdit();
  };

  const handleSend = async () => {
    if (!chatId || !draft.trim()) {
      return;
    }

    const plaintext = draft.trim();
    setError(null);

    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, plaintext);
      } else {
        await sendMessage({
          chatId,
          encryptedContent: plaintext,
          contentIv: "",
          encryptedKeys: {},
          type: "text",
          replyToMessageId: replyToMessage?.id ?? null,
        });
      }

      resetComposer();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    }
  };

  const handleSendVoice = async (recording: VoiceRecording) => {
    if (!chatId) {
      return;
    }

    const upload = await uploadVoiceRecording(recording, currentUserId);

    await sendMessage({
      chatId,
      encryptedContent: "",
      type: "voice",
      replyToMessageId: replyToMessage?.id ?? null,
      attachments: [
        {
          id: upload.path,
          url: upload.url,
          encryptedUrl: null,
          thumbnailUrl: null,
          type: "voice",
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
          width: null,
          height: null,
          durationSeconds: recording.durationSeconds,
          fileName: upload.fileName,
          isSpoiler: false,
        },
      ],
    });
    onCancelReply();
  };

  const handleFilePicked = async (file: File) => {
    if (!chatId) {
      return;
    }

    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "file");
      formData.append("userId", currentUserId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to upload file.");
      }

      const upload = (await response.json()) as {
        url: string;
        path: string;
        mimeType: string;
        sizeBytes: number;
        fileName: string;
      };

      await sendMessage({
        chatId,
        encryptedContent: file.name,
        type: detectFileMessageType(file),
        replyToMessageId: replyToMessage?.id ?? null,
        attachments: [
          {
            id: upload.path,
            url: upload.url,
            encryptedUrl: null,
            thumbnailUrl: null,
            type: detectFileMessageType(file),
            mimeType: upload.mimeType,
            sizeBytes: upload.sizeBytes,
            width: null,
            height: null,
            durationSeconds: null,
            fileName: upload.fileName,
            isSpoiler: false,
          },
        ],
      });
      onCancelReply();
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Failed to send file.");
    }
  };

  const handleSendSticker = async (sticker: SavedSticker) => {
    if (!chatId) {
      return;
    }

    setError(null);

    try {
      await sendMessage({
        chatId,
        encryptedContent: sticker.name,
        type: "sticker",
        replyToMessageId: replyToMessage?.id ?? null,
        attachments: [
          {
            id: sticker.id,
            url: sticker.url,
            encryptedUrl: null,
            thumbnailUrl: sticker.url,
            type: "sticker",
            mimeType: sticker.mimeType,
            sizeBytes: null,
            width: null,
            height: null,
            durationSeconds: null,
            fileName: sticker.fileName,
            isSpoiler: false,
          },
        ],
      });
      onCancelReply();
    } catch (stickerError) {
      setError(
        stickerError instanceof Error ? stickerError.message : "Failed to send sticker.",
      );
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (chatId) {
      sendTyping(chatId, value);
    }
  };

  const promptSet = chatId === "tepla-ai" ? aiPrompts : generalPrompts;
  const isEditing = Boolean(editingMessage);

  return (
    <div className="bg-black/10 px-3 py-3">
      <ReplyComposer
        mode="reply"
        message={replyToMessage}
        onCancel={onCancelReply}
      />
      <ReplyComposer
        mode="edit"
        message={editingMessage}
        onCancel={onCancelEdit}
      />

      {!draft.trim() && !replyToMessage && !editingMessage ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {promptSet.map((prompt) => (
            <Button
              key={prompt.label}
              type="button"
              variant="subtle"
              size="sm"
              className="rounded-full border border-white/10 bg-white/[0.04]"
              onClick={() => {
                handleDraftChange(prompt.value);
                composerRef.current?.focus();
              }}
            >
              {chatId === "tepla-ai" ? (
                <Bot className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {prompt.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <VoiceRecorder
          disabled={!chatId}
          highQuality={isPremium}
          onSend={handleSendVoice}
        />
        <StickerStudio
          currentUserId={currentUserId}
          disabled={!chatId}
          onSendSticker={handleSendSticker}
        />

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFilePicked(file);
              }
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              isEditing
                ? "Edit your message..."
                : demoMode
                  ? "Message the team, or ask Tepla AI for help..."
                  : "Write a message..."
            }
            className="min-h-[48px] max-h-40 flex-1 rounded-[28px] border-white/10 bg-black/30 px-4 py-3"
          />
          <Button
            type="button"
            size="icon"
            disabled={!draft.trim() || !chatId}
            onClick={() => {
              void handleSend();
            }}
            aria-label={isEditing ? "Save message" : "Send message"}
            className="h-11 w-11 shrink-0 rounded-full"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-tepla-danger">{error}</p> : null}

      <div className="mt-2 flex items-center justify-between text-[11px] text-tepla-text-muted">
        <span>
          {isEditing
            ? "Save the updated message with Enter."
            : demoMode
              ? "Demo mode is active with smart local replies."
              : "Press Enter to send and Shift+Enter for a new line."}
        </span>
        <span>
          {draft.trim().length
            ? `${draft.trim().length} chars`
            : isPremium
              ? "Premium HQ voice enabled"
              : "Instant send"}
        </span>
      </div>
    </div>
  );
};
