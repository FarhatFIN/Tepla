"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useSocket } from "@/hooks/useSocket";
import { DEMO_CHAT_META, getDemoMessages } from "@/lib/demo-data";
import { useChats } from "@/hooks/useChats";
import { getMessagePreview } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { useUIStore } from "@/stores/ui.store";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const activeChatId = useUIStore((state) => state.activeChatId);
  const setActiveChatId = useUIStore((state) => state.setActiveChatId);
  const messagesByChat = useChatStore((state) => state.messagesByChat);
  const { chats, createGroup, startDirectChat, toggleFavoriteChat, backendEnabled } = useChats();
  const isSettings = pathname?.startsWith("/settings");
  useSocket(activeChatId);

  useEffect(() => {
    if (chats.length === 0) {
      if (activeChatId) {
        setActiveChatId(null);
      }
      return;
    }

    const activeChatStillExists = chats.some((chat) => chat.id === activeChatId);
    if (!activeChatStillExists) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats, setActiveChatId]);

  const chatSnapshots = Object.fromEntries(
    chats.map((chat) => {
      const liveMessages =
        messagesByChat[chat.id] ??
        (DEMO_CHAT_META[chat.id]
          ? getDemoMessages(chat.id).map((message) => ({
              ...message,
              localId: message.id,
              status: "sent" as const,
            }))
          : []);
      const latest = liveMessages.at(-1);

      return [
        chat.id,
        {
          preview: latest
            ? getMessagePreview(latest.content, latest.type, latest.isDeleted)
            : chat.lastMessage
              ? getMessagePreview(
                  chat.lastMessage.content,
                  chat.lastMessage.type,
                  chat.lastMessage.isDeleted,
                )
              : chat.description ?? "No messages yet",
          updatedAt: latest?.createdAt ?? chat.lastMessage?.createdAt ?? chat.createdAt,
          unreadCount: DEMO_CHAT_META[chat.id]?.unreadCount ?? 0,
          online: DEMO_CHAT_META[chat.id]?.online ?? false,
        },
      ];
    }),
  );
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  return (
    <div className="flex h-full w-full">
      <Sidebar
        chats={chats}
        chatSnapshots={chatSnapshots}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        backendEnabled={backendEnabled}
        onCreateGroup={async (payload) => {
          const chat = await createGroup(payload);
          setActiveChatId(chat.id);
        }}
        onStartDirectChat={async (payload) => {
          const chat = await startDirectChat(payload);
          setActiveChatId(chat.id);
          return chat;
        }}
        onToggleFavoriteChat={toggleFavoriteChat}
      />
      <ErrorBoundary>
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          {isSettings ? children : <ChatWindow chat={activeChat} />}
        </div>
      </ErrorBoundary>
    </div>
  );
}
