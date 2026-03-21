"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import Sidebar from "@/components/layout/Sidebar";
import ChatArea from "@/components/layout/ChatArea";
import EmptyChat from "@/components/chat/EmptyChat";
import SettingsPanel from "@/components/layout/SettingsPanel";
import PremiumPanel from "@/components/layout/PremiumPanel";
import CallOverlay from "@/components/calls/CallOverlay";
import StickerPicker from "@/components/stickers/StickerPicker";

export default function Home() {
  const { user, isLoading, hydrate } = useAuthStore();
  const { chats, activeChatId, setActiveChat, messages, loadChats, bindSocket } = useChatStore();
  const router = useRouter();

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
      <div className="flex h-screen items-center justify-center bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[var(--accent)] border-t-transparent" />
          <span className="text-sm text-[var(--text-tertiary)]">Loading Tepla...</span>
        </div>
      </div>
    );
  }

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activeMessages = activeChatId ? messages[activeChatId] ?? [] : [];

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
      <CallOverlay />
    </main>
  );
}
