"use client";
import api from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat-store";
import { useShallow } from "zustand/react/shallow";

export default function IncomingCallModal() {
  const { incomingCall, setIncomingCall, chats, setActiveChat, toggleCalls, showCalls } = useChatStore(
    useShallow((s) => ({
      incomingCall: s.incomingCall,
      setIncomingCall: s.setIncomingCall,
      chats: s.chats,
      setActiveChat: s.setActiveChat,
      toggleCalls: s.toggleCalls,
      showCalls: s.showCalls,
    }))
  );

  if (!incomingCall || showCalls) return null;

  const chat = chats.find((c) => c.id === incomingCall.chatId);

  const accept = () => {
    const { chatId, type } = incomingCall;
    setIncomingCall(null);
    setActiveChat(chatId);
    toggleCalls(type); // opens CallOverlay, which joins the active call
  };

  const decline = () => {
    api.post(`/calls/${incomingCall.callId}/decline`).catch(() => { /* non-critical */ });
    setIncomingCall(null);
  };

  return (
    <div className="fixed left-1/2 top-4 z-[60] w-[320px] -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-2xl animate-scale-in">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={chat?.name || "?"} src={chat?.avatar} size="md" showStatus={false} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00D46A] ring-2 ring-[var(--bg-card)] animate-pulse">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.21 2.2z"/></svg>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{chat?.name || "Incoming call"}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {incomingCall.type === "video" ? "Incoming video call..." : "Incoming voice call..."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} className="flex-1 rounded-xl bg-[#00D46A] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00b85c]">
          Accept
        </button>
        <button onClick={decline} className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600">
          Decline
        </button>
      </div>
    </div>
  );
}
