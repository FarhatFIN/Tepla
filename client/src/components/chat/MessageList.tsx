"use client";
import { useEffect, useMemo, useRef } from "react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";
import { useChatStore } from "@/stores/chat-store";

interface MessageListProps {
  chatId: string;
  messages: Message[];
  currentUserId: string;
  searchMatchIds?: string[];
  activeSearchMessageId?: string;
}

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (d.toDateString() === today.toDateString()) label = "Today";
  else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";

  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-[var(--bg-card)] px-3 py-1 text-[11px] font-medium text-[var(--text-tertiary)] shadow-sm">
        {label}
      </span>
    </div>
  );
}

/** Distance from the bottom (px) under which we still consider the user "at the bottom". */
const NEAR_BOTTOM_PX = 120;

/** Distance from the top (px) under which we start loading older history. */
const NEAR_TOP_PX = 200;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function MessageList({ chatId, messages, currentUserId, searchMatchIds = [], activeSearchMessageId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchMatchSet = useMemo(() => new Set(searchMatchIds), [searchMatchIds]);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const loadingHistory = useChatStore((s) => s.messagesLoading[chatId]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;

    // Infinite scroll up: fetch older history and keep the viewport stable
    if (el.scrollTop < NEAR_TOP_PX && !loadingOlderRef.current && messages.length > 0) {
      loadingOlderRef.current = true;
      const prevHeight = el.scrollHeight;
      const prevTop = el.scrollTop;
      loadOlderMessages(chatId).finally(() => {
        requestAnimationFrame(() => {
          const node = containerRef.current;
          if (node) node.scrollTop = prevTop + (node.scrollHeight - prevHeight);
          loadingOlderRef.current = false;
        });
      });
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.senderId === currentUserId;
    // Don't yank the view while the user is reading history — only follow
    // the bottom when they are already there, or when they sent the message.
    if (!nearBottomRef.current && !isOwnMessage) return;
    bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [messages, currentUserId]);

  useEffect(() => {
    if (!activeSearchMessageId) return;
    messageRefs.current[activeSearchMessageId]?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  }, [activeSearchMessageId]);

  // History is being fetched for the first time: show bubble skeletons
  if (messages.length === 0 && loadingHistory) {
    return (
      <div className="flex-1 overflow-hidden chat-wallpaper px-4 py-4" aria-busy="true" aria-label="Loading messages">
        <div className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"} animate-pulse`}>
              <div className="h-10 rounded-2xl bg-[var(--bg-card)]" style={{ width: `${40 + ((i * 13) % 35)}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 chat-wallpaper">
        <div className="relative z-[1] flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(91,33,182,0.2), rgba(108,61,232,0.2))" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">No messages yet. Say hi!</p>
        </div>
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  let lastDate = "";

  messages.forEach((msg, i) => {
    if (msg.date !== lastDate) { elements.push(<DateSeparator key={`d-${msg.date}`} date={msg.date} />); lastDate = msg.date; }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isOwn = msg.senderId === currentUserId;
    const isFirstInGroup = !prev || prev.senderId !== msg.senderId || prev.date !== msg.date;
    const isLastInGroup = !next || next.senderId !== msg.senderId || next.date !== msg.date;
    const isSearchMatch = searchMatchSet.has(msg.id);
    const isActiveSearchMatch = activeSearchMessageId === msg.id;
    elements.push(
      <div
        key={msg.id}
        ref={(node) => { messageRefs.current[msg.id] = node; }}
        // content-visibility skips layout and paint for off-screen rows;
        // contain-intrinsic-size keeps the scrollbar stable while skipped.
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 64px" }}
        className={`${isSearchMatch ? "rounded-2xl transition-shadow" : ""} ${isActiveSearchMatch ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#130D24]" : isSearchMatch ? "ring-1 ring-[var(--accent)]/40" : ""}`}
      >
        <MessageBubble message={msg} isOwn={isOwn} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} />
      </div>
    );
  });

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto chat-wallpaper">
      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col px-4 py-3">{elements}<div ref={bottomRef} /></div>
    </div>
  );
}
