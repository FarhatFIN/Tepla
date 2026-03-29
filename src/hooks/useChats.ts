import useSWR from "swr";
import { useAuthStore } from "@/stores/auth.store";
import type { TeplaChat } from "@/types/chat";
import { DEMO_CHATS, DEMO_CURRENT_USER } from "@/lib/demo-data";

type ChatsResponse = {
  chats: TeplaChat[];
};

const getAuthHeaders = (): Record<string, string> => {
  const { accessToken } = useAuthStore.getState();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (!response.ok) {
    throw new Error("Failed to load chats.");
  }

  return (await response.json()) as ChatsResponse;
};

export const useChats = () => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?.id ?? DEMO_CURRENT_USER.id;
  const backendEnabled = Boolean(authUser?.id);
  const swrKey = backendEnabled ? `/api/chats` : null;

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
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
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
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        type: "direct",
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

  return {
    chats: backendEnabled ? data?.chats ?? [] : DEMO_CHATS,
    currentUserId,
    backendEnabled,
    isLoading: backendEnabled ? isLoading : false,
    error,
    createGroup,
    startDirectChat,
    refreshChats: mutate,
  };
};
