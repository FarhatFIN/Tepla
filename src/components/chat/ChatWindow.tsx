"use client";

import { useEffect, useState } from "react";
import { Crown, Phone, Search, ShieldCheck, Sparkles, Video, X } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import type { SparksPackageAmount } from "@/lib/sparks";
import type { TeplaChat } from "@/types/chat";
import type { SparksGiftId } from "@/types/sparks";
import { useMessages } from "@/hooks/useMessages";
import { useSparks } from "@/hooks/useSparks";
import { usePresenceStore } from "@/stores/presence.store";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LocalMessage } from "@/stores/chat.store";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { PinnedMessagesBar } from "./PinnedMessagesBar";
import { SparksDialog } from "./SparksDialog";
import { DEMO_CHAT_META } from "@/lib/demo-data";

type ChatWindowProps = {
  chat: TeplaChat | null;
};

type PremiumSearchMode = "text" | "media" | "pinned" | "mine";

const premiumSearchModes: Array<{
  id: PremiumSearchMode;
  label: string;
}> = [
  { id: "text", label: "Text" },
  { id: "media", label: "Media" },
  { id: "pinned", label: "Pinned" },
  { id: "mine", label: "My messages" },
];

const formatDayLabel = (isoString: string) =>
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(isoString));

const targetCanReceiveSparks = (message: LocalMessage, currentUserId: string) =>
  Boolean(message.senderId && message.senderId !== currentUserId);

export const ChatWindow = ({ chat }: ChatWindowProps) => {
  const chatId = chat?.id ?? null;
  const authUser = useAuthStore((state) => state.user);
  const isPremium = Boolean(authUser?.isPremium);
  const setMessageSparks = useChatStore((state) => state.setMessageSparks);
  const {
    messages,
    pinnedMessages,
    isLoading,
    isLoadingOlder,
    hasMore,
    error,
    currentUserId,
    demoMode,
    deleteMessage,
    togglePinMessage,
    toggleReaction,
    loadOlder,
  } = useMessages(chatId);
  const { balance, packages, purchaseSparks, transferSparks } = useSparks();
  const typingByChat = usePresenceStore((state) => state.typingByChat);
  const [replyToMessage, setReplyToMessage] = useState<LocalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<LocalMessage | null>(null);
  const [sparkTargetMessage, setSparkTargetMessage] = useState<LocalMessage | null>(null);
  const [isChannelDonationOpen, setChannelDonationOpen] = useState(false);
  const [isWalletOpen, setWalletOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<PremiumSearchMode>("text");
  const [actionError, setActionError] = useState<string | null>(null);
  const chatMeta = chatId ? DEMO_CHAT_META[chatId] : null;
  const canManagePins =
    demoMode ||
    chat?.currentUserRole === "owner" ||
    chat?.currentUserRole === "admin";
  const activeTypingUsers = chatId
    ? Array.from(typingByChat[chatId] ?? []).filter((userId) => userId !== currentUserId)
    : [];

  useEffect(() => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setActionError(null);
    setSearchQuery("");
    setSearchOpen(false);
    setSearchMode("text");
    setSparkTargetMessage(null);
    setChannelDonationOpen(false);
    setWalletOpen(false);
  }, [chatId]);

  if (!chatId || !chat) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_bottom,rgba(108,99,255,0.16),transparent_48%),linear-gradient(180deg,#040816,#02050d)] px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-sky-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Tepla is ready for real chats</h2>
          <p className="mt-2 text-sm text-tepla-text-muted">
            Create a group, search teammates by username, and start building your chat
            history from here.
          </p>
        </div>
      </div>
    );
  }

  const typingLabel =
    activeTypingUsers.length > 0
      ? `${chatMeta?.companionName ?? "Someone"} is typing...`
      : null;

  const handleEdit = async (message: LocalMessage) => {
    setEditingMessage(message);
    setReplyToMessage(null);
  };

  const handleDelete = async (message: LocalMessage) => {
    if (!window.confirm("Delete this message for everyone in the chat?")) {
      return;
    }

    try {
      setActionError(null);
      await deleteMessage(message.id);
      if (editingMessage?.id === message.id) {
        setEditingMessage(null);
      }
      if (replyToMessage?.id === message.id) {
        setReplyToMessage(null);
      }
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete message.",
      );
    }
  };

  const handlePinToggle = async (message: LocalMessage) => {
    try {
      setActionError(null);
      await togglePinMessage(message.id, !message.isPinned);
    } catch (pinError) {
      setActionError(pinError instanceof Error ? pinError.message : "Failed to pin message.");
    }
  };

  const handleReactionToggle = async (
    message: LocalMessage,
    emoji: string,
    hasReacted: boolean,
  ) => {
    try {
      setActionError(null);
      await toggleReaction(message.id, emoji, hasReacted);
    } catch (reactionError) {
      setActionError(
        reactionError instanceof Error ? reactionError.message : "Failed to update reaction.",
      );
    }
  };

  const handleSendSparks = async (amount: number) => {
    if (!chatId || !sparkTargetMessage) {
      return;
    }

    setActionError(null);
    const payload = await transferSparks({
      messageId: sparkTargetMessage.id,
      amount,
    });

    if (payload.sparkSummary) {
      setMessageSparks(chatId, sparkTargetMessage.id, {
        ...payload.sparkSummary,
        sparkedByCurrentUser: true,
      });
    }
  };

  const handleSendGift = async (giftId: SparksGiftId) => {
    if (!chatId || !sparkTargetMessage) {
      return;
    }

    setActionError(null);
    const payload = await transferSparks({
      messageId: sparkTargetMessage.id,
      giftId,
    });

    if (payload.sparkSummary) {
      setMessageSparks(chatId, sparkTargetMessage.id, {
        ...payload.sparkSummary,
        sparkedByCurrentUser: true,
      });
    }
  };

  const handleDonateToChannel = async (amount: number) => {
    if (!chatId || chat.type !== "channel") {
      return;
    }

    setActionError(null);
    await transferSparks({
      chatId,
      amount,
    });
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const visibleMessages = messages.filter((message) => {
    const matchesPremiumMode =
      !isPremium ||
      (searchMode === "media"
        ? message.attachments.length > 0 ||
          ["image", "video", "audio", "voice", "file", "sticker", "gif"].includes(message.type)
        : searchMode === "pinned"
          ? message.isPinned
          : searchMode === "mine"
            ? message.senderId === currentUserId
            : true);

    if (!matchesPremiumMode) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    const textMatch = message.content.toLowerCase().includes(normalizedSearchQuery);
    if (!isPremium) {
      return textMatch;
    }

    const attachmentNames = message.attachments
      .map((attachment) => attachment.fileName ?? "")
      .join(" ")
      .toLowerCase();
    const replyPreview = message.replyToMessage?.content?.toLowerCase() ?? "";

    return (
      textMatch ||
      attachmentNames.includes(normalizedSearchQuery) ||
      message.type.toLowerCase().includes(normalizedSearchQuery) ||
      replyPreview.includes(normalizedSearchQuery)
    );
  });

  return (
    <div className="flex h-full flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_bottom,rgba(108,99,255,0.12),transparent_46%),linear-gradient(180deg,#050816,#020617_48%,#02040a)]">
      <div className="border-b border-tepla-border/70 bg-black/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              size="md"
              src={chat.avatarUrl ?? undefined}
              alt={chat.name ?? chat.username ?? "Chat"}
              online={chatMeta?.online}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-white">
                  {chat.name ?? chat.username ?? "Conversation"}
                </h2>
                {chat.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                ) : null}
                {demoMode ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/70">
                    <Sparkles className="h-3 w-3" />
                    Demo mode
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-tepla-text-muted">
                {chat.username ? `@${chat.username}` : chat.description ?? "Encrypted conversation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authUser?.id && !demoMode ? (
              <>
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setSparkTargetMessage(null);
                    setChannelDonationOpen(false);
                    setWalletOpen(true);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {balance} sparks
                </Button>
                {chat.type === "channel" && chat.createdBy !== authUser.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSparkTargetMessage(null);
                      setWalletOpen(false);
                      setChannelDonationOpen(true);
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Donate
                  </Button>
                ) : null}
              </>
            ) : null}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Search conversation"
                onClick={() => setSearchOpen((current) => !current)}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Start voice call">
                <Phone className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Start video call">
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isSearchOpen ? (
        <div className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                isPremium
                  ? "Search messages, files, pinned notes, and replies"
                  : "Search messages in this chat"
              }
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isPremium ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {premiumSearchModes.map((mode) => (
                <Button
                  key={mode.id}
                  type="button"
                  size="sm"
                  variant={searchMode === mode.id ? "primary" : "ghost"}
                  onClick={() => setSearchMode(mode.id)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100">
              <Crown className="h-3.5 w-3.5" />
              Premium unlocks media, pinned, and author filters plus attachment-aware search.
            </div>
          )}
          <p className="mt-2 text-xs text-tepla-text-muted">
            {searchQuery.trim()
              ? `Found ${visibleMessages.length} matching message${visibleMessages.length === 1 ? "" : "s"} in this conversation.`
              : isPremium
                ? "Search by text, attachment name, message type, reply context, or premium filters."
                : "Search by message text."}
          </p>
        </div>
      ) : null}

      <PinnedMessagesBar messages={pinnedMessages} />

      <div className="relative flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-tepla-text-muted">
            Loading messages...
          </div>
        ) : visibleMessages.length > 0 ? (
          <Virtuoso
            style={{ height: "100%", width: "100%" }}
            data={visibleMessages}
            followOutput="smooth"
            initialTopMostItemIndex={Math.max(visibleMessages.length - 1, 0)}
            computeItemKey={(_, message) => message.localId}
            startReached={() => {
              if (!searchQuery.trim()) {
                void loadOlder();
              }
            }}
            components={{
              Header: () =>
                !searchQuery.trim() && (hasMore || isLoadingOlder) ? (
                  <div className="py-3 text-center text-xs text-tepla-text-muted">
                    {isLoadingOlder ? "Loading older messages..." : "Scroll up for more history"}
                  </div>
                ) : null,
            }}
            itemContent={(index, message) => {
              const previousMessage = visibleMessages[index - 1];
              const showDateSeparator =
                !previousMessage ||
                formatDayLabel(previousMessage.createdAt) !==
                  formatDayLabel(message.createdAt);

              return (
                <div className="py-2">
                  {showDateSeparator ? (
                    <div className="mb-3 flex justify-center">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-tepla-text-muted">
                        {formatDayLabel(message.createdAt)}
                      </span>
                    </div>
                  ) : null}
                  <MessageBubble
                    key={message.localId}
                    message={message}
                    isOwn={message.senderId === currentUserId}
                    canPin={canManagePins}
                    onReply={(target) => {
                      setReplyToMessage(target);
                      setEditingMessage(null);
                    }}
                    onEdit={(target) => {
                      void handleEdit(target);
                    }}
                    onDelete={(target) => {
                      void handleDelete(target);
                    }}
                    onTogglePin={(target) => {
                      void handlePinToggle(target);
                    }}
                    onToggleReaction={(target, emoji, hasReacted) => {
                      void handleReactionToggle(target, emoji, hasReacted);
                    }}
                    canSendSparks={Boolean(authUser?.id && !demoMode && targetCanReceiveSparks(message, currentUserId))}
                    onSendSparks={(target) => {
                      setWalletOpen(false);
                      setChannelDonationOpen(false);
                      setSparkTargetMessage(target);
                    }}
                  />
                </div>
              );
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-sm rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-6">
              <h3 className="text-lg font-semibold text-white">
                {searchQuery.trim() ? "No search results yet" : "The thread is ready"}
              </h3>
              <p className="mt-2 text-sm text-tepla-text-muted">
                {searchQuery.trim()
                  ? "Try another query. Search works across the messages currently loaded in this chat."
                  : "Start with a launch update, reply to teammates, pin important notes, or send a voice message to make the room feel live immediately."}
              </p>
            </div>
          </div>
        )}
      </div>

      {(error && !demoMode) || actionError ? (
        <div className="mx-3 mb-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {actionError ??
            "The UI is live, but the database-backed message API is unavailable right now."}
        </div>
      ) : null}

      <div className="border-t border-tepla-border/70 bg-black/5">
        {typingLabel ? (
          <div className="px-4 pt-3 text-xs text-tepla-text-muted">{typingLabel}</div>
        ) : null}
        <MessageInput
          chatId={chatId}
          replyToMessage={replyToMessage}
          editingMessage={editingMessage}
          onCancelReply={() => setReplyToMessage(null)}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      <SparksDialog
        open={Boolean(isWalletOpen || sparkTargetMessage || isChannelDonationOpen)}
        title={
          sparkTargetMessage
            ? "Send Sparks"
            : isChannelDonationOpen
              ? "Support this channel"
              : "Your Sparks Wallet"
        }
        description={
          sparkTargetMessage
            ? "Support this message with sparks or send a premium gift."
            : isChannelDonationOpen
              ? "Donate sparks straight to the channel owner and support future posts."
              : "Top up your wallet and get ready to support conversations."
        }
        balance={balance}
        packages={packages}
        onClose={() => {
          setWalletOpen(false);
          setSparkTargetMessage(null);
          setChannelDonationOpen(false);
        }}
        onPurchase={async (packageAmount) => {
          setActionError(null);
          await purchaseSparks(packageAmount as SparksPackageAmount);
        }}
        onSend={
          sparkTargetMessage
            ? async (amount) => {
                await handleSendSparks(amount);
              }
            : isChannelDonationOpen
              ? async (amount) => {
                  await handleDonateToChannel(amount);
                }
            : undefined
        }
        onSendGift={
          sparkTargetMessage
            ? async (giftId) => {
                await handleSendGift(giftId);
              }
            : undefined
        }
      />
    </div>
  );
};
