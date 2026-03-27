"use client";
import { useEffect, useRef } from "react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
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

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
    elements.push(<MessageBubble key={msg.id} message={msg} isOwn={isOwn} isFirstInGroup={isFirstInGroup} isLastInGroup={isLastInGroup} />);
  });

  return (
    <div className="flex-1 overflow-y-auto chat-wallpaper">
      <div className="relative z-[1] mx-auto flex max-w-3xl flex-col px-4 py-3">{elements}<div ref={bottomRef} /></div>
    </div>
  );
}
