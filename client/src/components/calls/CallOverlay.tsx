"use client";
import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat-store";

export default function CallOverlay() {
  const { showCalls, toggleCalls, chats, activeChatId } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [callTime, setCallTime] = useState("0:23");
  const chat = chats.find((c) => c.id === activeChatId);

  if (!showCalls || !chat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] animate-fade-in">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl bg-[var(--bg-card)] p-8 shadow-2xl animate-scale-in">
        <Avatar name={chat.name} src={chat.avatar} size="xl" showStatus={false} />
        <div className="text-center">
          <h2 className="text-xl font-semibold">{chat.name}</h2>
          <p className="mt-1 text-sm text-emerald-400">Calling... {callTime}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isMuted ? "bg-red-500/20 text-red-400" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`}>
            {isMuted
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
          </button>

          <button onClick={() => setIsVideoOff(!isVideoOff)} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isVideoOff ? "bg-[var(--bg-input)] text-[var(--text-primary)]" : "bg-[var(--accent)] text-white"}`}>
            {isVideoOff
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 7l-5 3.5V7a2 2 0 0 0-2-2H5"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>}
          </button>

          <button className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>

          <button onClick={toggleCalls} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
