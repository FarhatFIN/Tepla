import useSWR from "swr";
import { useAuthStore } from "@/stores/auth.store";
import type { TeplaChat } from "@/types/chat";
// Demo data removed — all chats come from the backend

type ChatsResponse = {
  chats: TeplaChat[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load chats.");
  }

  return (await response.json()) as ChatsResponse;
};

export const useChats = () => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?.id ?? '';
  const backendEnabled = Boolean(authUser?.id);
  const swrKey = backendEnabled
    ? `/api/chats?userId=${encodeURIComponent(currentUserId)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ChatsResponse>(swrKey, fetcher);

  const createGroup = async (payload: {
    name: string;
    username?: string | null;
    description?: string | null;
    memberIds: string[];
  }) => {
    if (!backendEnabled) {
      throw new Error("Sign in to create and persist groups.");
    }

    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        ...payload,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to create group.");
    }

    const result = (await response.json()) as { chat: TeplaChat };
    await mutate(
      (current) => ({
        chats: [result.chat, ...(current?.chats ?? [])],
      }),
      { revalidate: true },
    );

    return result.chat;
  };

  const startDirectChat = async (payload: {
    peerUserId: string;
    peerUsername?: string | null;
    peerDisplayName?: string | null;
  }) => {
    if (!backendEnabled) {
      throw new Error("Sign in to start direct chats.");
    }

    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "direct",
        userId: currentUserId,
        peerUserId: payload.peerUserId,
        peerUsername: payload.peerUsername ?? null,
        peerDisplayName: payload.peerDisplayName ?? null,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to open direct chat.");
    }

    const result = (await response.json()) as { chat: TeplaChat };
    await mutate(
      (current) => {
        const nextChats = [
          result.chat,
          ...(current?.chats ?? []).filter((chat) => chat.id !== result.chat.id),
        ];
        return { chats: nextChats };
      },
      { revalidate: true },
    );

    return result.chat;
  };

  const toggleFavoriteChat = async (chatId: string, favorite: boolean) => {
    if (!backendEnabled) {
      throw new Error("Sign in to sync favorites across your devices.");
    }

    const response = await fetch(`/api/chats/${chatId}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        favorite,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Failed to update favorites.");
    }

    await mutate(
      (current) =>
        current
          ? {
              chats: current.chats.map((chat) =>
                chat.id === chatId ? { ...chat, isFavorite: favorite } : chat,
              ),
            }
          : current,
      { revalidate: true },
    );
  };

  return {
    chats: data?.chats ?? [],
    currentUserId,
    backendEnabled,
    isLoading: backendEnabled ? isLoading : false,
    error,
    createGroup,
    startDirectChat,
    toggleFavoriteChat,
    refreshChats: mutate,
  };
};
