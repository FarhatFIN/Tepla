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
  const { showProfile, sendMessage } = useChatStore();
  const pinnedMessages = messages.filter((m) => m.isPinned);

  const quickActions = [
    { label: "Launch update", icon: "🚀" },
    { label: "Standup", icon: "📋" },
    { label: "Patch note", icon: "🔧" },
  ];

  return (
    <section className="flex h-full bg-[var(--bg-main)] transition-colors">
      <div className="flex min-w-0 flex-1 flex-col">
        <Header chat={chat} onBack={onBack} />

        {/* Pinned messages section */}
        {pinnedMessages.length > 0 && (
          <div className="border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">Pinned Messages</span>
            </div>
            <div className="rounded-lg bg-[var(--bg-input)] px-3 py-2">
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {pinnedMessages[pinnedMessages.length - 1].text}
              </p>
            </div>
          </div>
        )}

        <MessageList messages={messages} currentUserId={currentUserId} />

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-t border-[var(--border)] bg-[var(--bg-sidebar)]">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(chat.id, `${action.icon} ${action.label}`, "text")}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

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
