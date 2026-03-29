"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useShallow } from "zustand/react/shallow";
import Sidebar from "@/components/layout/Sidebar";
import ChatArea from "@/components/layout/ChatArea";
import EmptyChat from "@/components/chat/EmptyChat";
import SettingsPanel from "@/components/layout/SettingsPanel";
import PremiumPanel from "@/components/layout/PremiumPanel";
import WalletPanel from "@/components/layout/WalletPanel";
import WBITPanel from "@/components/layout/WBITPanel";
import CallOverlay from "@/components/calls/CallOverlay";
import StickerPicker from "@/components/stickers/StickerPicker";
import LockScreen, { useAutoLock } from "@/components/auth/LockScreen";
import { useTranslation } from "@/hooks/useTranslation";

export default function Home() {
  const { user, isLoading, hydrate } = useAuthStore();
  const { chats, activeChatId, setActiveChat, messages, loadChats, bindSocket } = useChatStore(useShallow(s => ({ chats: s.chats, activeChatId: s.activeChatId, setActiveChat: s.setActiveChat, messages: s.messages, loadChats: s.loadChats, bindSocket: s.bindSocket })));
  const router = useRouter();
  const t = useTranslation();
  const { locked, unlock } = useAutoLock();

  useEffect(() => { hydrate(); }, [hydrate]);

  // Once authenticated, load chats from API and bind socket events
  useEffect(() => {
    if (!isLoading && user) {
      loadChats();
      bindSocket();
    }
  }, [user, isLoading, loadChats, bindSocket]);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#130D24]" style={{ backgroundImage: "url('/wallpaper/tepla-pattern.svg')", backgroundSize: "400px 400px" }}>
        <div className="absolute inset-0 bg-[rgba(10,6,18,0.88)]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #5B21B6, #6C3DE8)", boxShadow: "0 0 24px rgba(108,61,232,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white">Tepla</h1>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        </div>
      </div>
    );
  }

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activeMessages = activeChatId ? messages[activeChatId] ?? [] : [];

  if (locked) return <LockScreen onUnlock={unlock} pinLength={parseInt(localStorage.getItem("tepla-passcode-length") || "4") as 4 | 6} />;

  return (
    <main className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full shrink-0 md:block md:w-[340px] lg:w-[360px] md:border-r md:border-[var(--border)] ${activeChatId ? "hidden" : "block"}`}>
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className={`relative min-w-0 flex-1 ${activeChatId ? "block" : "hidden md:block"}`}>
        {activeChat ? (
          <ChatArea chat={activeChat} messages={activeMessages} currentUserId={user.id} onBack={() => setActiveChat(null)} />
        ) : (
          <EmptyChat />
        )}

        {/* Sticker picker - floats above message input */}
        <StickerPicker />
      </div>

      {/* Overlays */}
      <SettingsPanel />
      <PremiumPanel />
      <WalletPanel />
      <WBITPanel />
      <CallOverlay />
    </main>
  );
}
