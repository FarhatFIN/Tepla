"use client";
import { useMemo, useState } from "react";
import { Chat, Message } from "@/types";
import Header from "./Header";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import ProfilePanel from "@/components/profile/ProfilePanel";
import { useChatStore } from "@/stores/chat-store";
import { useTranslation } from "@/hooks/useTranslation";

interface ChatAreaProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onBack: () => void;
}

export default function ChatArea({ chat, messages, currentUserId, onBack }: ChatAreaProps) {
  const { showProfile, sendMessage } = useChatStore();
  const t = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [searchCursor, setSearchCursor] = useState({ index: 0, key: "" });
  const pinnedMessages = messages.filter((m) => m.isPinned);
  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const searchKey = `${chat.id}:${normalizedMessageSearch}`;
  const searchMatches = useMemo(() => {
    if (!normalizedMessageSearch) return [];
    return messages.filter((message) =>
      [message.text, message.senderName, message.translatedText]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedMessageSearch))
    );
  }, [messages, normalizedMessageSearch]);
  const activeSearchIndex = searchCursor.key === searchKey
    ? Math.min(searchCursor.index, Math.max(searchMatches.length - 1, 0))
    : 0;
  const activeSearchMessageId = searchMatches[activeSearchIndex]?.id;

  const quickActions = [
    { label: t("launch_update"), icon: "🚀" },
    { label: t("standup"), icon: "📋" },
    { label: t("patch_note"), icon: "🔧" },
  ];

  const stepSearchMatch = (direction: 1 | -1) => {
    if (!searchMatches.length) return;
    setSearchCursor((current) => {
      const currentIndex = current.key === searchKey ? current.index : 0;
      return {
        key: searchKey,
        index: (currentIndex + direction + searchMatches.length) % searchMatches.length,
      };
    });
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setMessageSearch("");
    setSearchCursor({ index: 0, key: "" });
  };

  return (
    <section className="flex h-full bg-[#130D24] transition-colors">
      <div className="flex min-w-0 flex-1 flex-col">
        <Header chat={chat} onBack={onBack} onSearch={() => setSearchOpen((open) => !open)} />

        {searchOpen && (
          <div className="border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                autoFocus
                type="text"
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") stepSearchMatch(event.shiftKey ? -1 : 1);
                  if (event.key === "Escape") closeSearch();
                }}
                placeholder={t("search_messages")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
              />
              <span className="min-w-[54px] text-right text-[11px] font-medium text-[var(--text-tertiary)]">
                {normalizedMessageSearch ? (searchMatches.length ? `${activeSearchIndex + 1}/${searchMatches.length}` : t("no_matches")) : "0"}
              </span>
              <button type="button" disabled={!searchMatches.length} onClick={() => stepSearchMatch(-1)} className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40" aria-label="Previous match">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button type="button" disabled={!searchMatches.length} onClick={() => stepSearchMatch(1)} className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40" aria-label="Next match">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <button type="button" onClick={closeSearch} className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" aria-label="Close search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Pinned messages section */}
        {pinnedMessages.length > 0 && (
          <div className="border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("pinned_messages")}</span>
            </div>
            <div className="rounded-lg bg-[var(--bg-input)] px-3 py-2">
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {pinnedMessages[pinnedMessages.length - 1].text}
              </p>
            </div>
          </div>
        )}

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          searchMatchIds={searchMatches.map((message) => message.id)}
          activeSearchMessageId={activeSearchMessageId}
        />

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
