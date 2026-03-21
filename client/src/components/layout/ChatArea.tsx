"use client";
import { Chat, Message } from "@/types";
import Header from "./Header";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import ProfilePanel from "@/components/profile/ProfilePanel";
import { useChatStore } from "@/stores/chat-store";

interface ChatAreaProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
}

export default function ChatArea({ chat, messages, currentUserId, onBack }: ChatAreaProps) {
  const { showProfile } = useChatStore();
  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <section className="flex h-full bg-[var(--bg-main)] transition-colors">
      <div className="flex min-w-0 flex-1 flex-col">
        <Header chat={chat} onBack={onBack} />

        {/* Pinned message bar */}
        {pinnedMessages.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--accent)]">Pinned: </span>
              {pinnedMessages[pinnedMessages.length - 1].text}
            </p>
          </div>
        )}

        <MessageList messages={messages} currentUserId={currentUserId} />
        <MessageInput chatId={chat.id} />
      </div>

      {/* Profile panel */}
      {showProfile && (
        <div className="hidden w-[320px] shrink-0 border-l border-[var(--border)] lg:block animate-slide-in-right">
          <ProfilePanel chat={chat} />
        </div>
      )}
    </section>
  );
}
