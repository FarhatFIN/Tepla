import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search as SearchIcon,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";
import { ChatListItem } from "./ChatListItem";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { SearchBar } from "./SearchBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useUserSearch } from "@/hooks/useUserSearch";
import type { TeplaChat } from "@/types/chat";

export type ChatSnapshot = {
  preview: string;
  updatedAt: string;
  unreadCount: number;
  online: boolean;
};

type SidebarProps = {
  chats: TeplaChat[];
  chatSnapshots: Record<string, ChatSnapshot>;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
  backendEnabled: boolean;
  onCreateGroup: (payload: {
    name: string;
    username?: string | null;
    description?: string | null;
    memberIds: string[];
  }) => Promise<void>;
  onStartDirectChat: (payload: {
    peerUserId: string;
    peerUsername?: string | null;
    peerDisplayName?: string | null;
  }) => Promise<TeplaChat>;
  onToggleFavoriteChat: (chatId: string, favorite: boolean) => Promise<void>;
};

export const Sidebar = ({
  chats,
  chatSnapshots,
  onSelectChat,
  activeChatId,
  backendEnabled,
  onCreateGroup,
  onStartDirectChat,
  onToggleFavoriteChat,
}: SidebarProps) => {
  const [query, setQuery] = useState("");
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const {
    isSidebarCollapsed,
    setSidebarCollapsed,
    pinnedChatIds,
    favoriteChatIds,
    togglePinnedChat,
    toggleFavoriteChat: toggleFavoriteChatLocal,
  } =
    useUIStore();
  const MAX_PINNED_CHATS = 100;
  const { users: searchedUsers, isLoading: isSearchingUsers } = useUserSearch(query);

  const isChatFavorite = (chat: TeplaChat) =>
    backendEnabled ? Boolean(chat.isFavorite) : favoriteChatIds.includes(chat.id);

  const filteredChats = useMemo(() => {
    const source = query
      ? chats.filter((chat) => {
          const searchText = [
            chat.name,
            chat.username,
            chat.description,
            chat.lastMessage?.content,
            chatSnapshots[chat.id]?.preview,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchText.includes(query.toLowerCase());
        })
      : chats;

    return [...source].sort((left, right) => {
      const leftPinnedIndex = pinnedChatIds.indexOf(left.id);
      const rightPinnedIndex = pinnedChatIds.indexOf(right.id);

      if (leftPinnedIndex >= 0 && rightPinnedIndex >= 0) {
        return leftPinnedIndex - rightPinnedIndex;
      }

      if (leftPinnedIndex >= 0) {
        return -1;
      }

      if (rightPinnedIndex >= 0) {
        return 1;
      }

      const leftDate = chatSnapshots[left.id]?.updatedAt ?? left.createdAt;
      const rightDate = chatSnapshots[right.id]?.updatedAt ?? right.createdAt;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });
  }, [chatSnapshots, chats, pinnedChatIds, query]);

  const totalUnread = Object.values(chatSnapshots).reduce(
    (sum, snapshot) => sum + snapshot.unreadCount,
    0,
  );
  const liveNow = Object.values(chatSnapshots).filter((snapshot) => snapshot.online).length;
  const userSearchActive = backendEnabled && query.trim().replace(/^@+/, "").length >= 2;
  const canPinMoreChats = pinnedChatIds.length < MAX_PINNED_CHATS;
  const favoriteChats = filteredChats.filter((chat) => isChatFavorite(chat));
  const regularChats = filteredChats.filter((chat) => !isChatFavorite(chat));
  const orderedChats = [...favoriteChats, ...regularChats];

  return (
    <>
      <motion.aside
        className="hidden h-full shrink-0 flex-col border-r border-tepla-border/80 bg-[linear-gradient(135deg,rgba(15,15,24,0.96),rgba(10,12,20,0.96))] text-xs text-tepla-text-secondary md:flex"
        animate={{ width: isSidebarCollapsed ? 72 : 320 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-tepla-text-muted">
              Tepla
            </p>
            {!isSidebarCollapsed ? (
              <p className="text-sm font-semibold text-tepla-text">Startup Mode</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isSidebarCollapsed ? (
          <>
            <div className="mx-2 mb-2 rounded-3xl border border-white/10 bg-white/[0.03] px-3 py-3 text-tepla-text">
              <div className="flex items-center gap-2 text-[11px] font-medium text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Investor-demo quality pass
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-tepla-text-muted">
                <div className="rounded-2xl bg-black/20 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em]">Unread</div>
                  <div className="mt-1 text-lg font-semibold text-white">{totalUnread}</div>
                </div>
                <div className="rounded-2xl bg-black/20 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em]">Live now</div>
                  <div className="mt-1 text-lg font-semibold text-white">{liveNow}</div>
                </div>
              </div>
            </div>
            <SearchBar value={query} onChange={setQuery} />
            <div className="px-2 pb-2">
              <Button
                type="button"
                variant="subtle"
                size="sm"
                className="w-full justify-start"
                disabled={!backendEnabled}
                onClick={() => setCreateGroupOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New group
              </Button>
            </div>
          </>
        ) : (
          <div className="px-2 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!backendEnabled}
              aria-label="Create group"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 px-1 pb-2">
          {!isSidebarCollapsed && userSearchActive ? (
            <div className="mb-3 space-y-2 px-1">
              <div className="px-2 text-[10px] uppercase tracking-[0.18em] text-tepla-text-muted">
                People
              </div>
              <div className="space-y-1">
                {isSearchingUsers ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-tepla-text-muted">
                    Searching usernames...
                  </div>
                ) : searchedUsers.length > 0 ? (
                  searchedUsers.map((user) => {
                    const matchingChat = chats.find(
                      (chat) =>
                        chat.username === user.username ||
                        chat.name === user.displayName,
                    );

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={async () => {
                          try {
                            setSearchError(null);

                            if (matchingChat) {
                              onSelectChat(matchingChat.id);
                              return;
                            }

                            const chat = await onStartDirectChat({
                              peerUserId: user.id,
                              peerUsername: user.username,
                              peerDisplayName: user.displayName,
                            });
                            onSelectChat(chat.id);
                          } catch (directChatError) {
                            setSearchError(
                              directChatError instanceof Error
                                ? directChatError.message
                                : "Failed to open chat.",
                            );
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-sky-400/20 hover:bg-white/[0.05]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            size="sm"
                            alt={user.displayName ?? user.username}
                            src={user.avatarUrl ?? undefined}
                            animated={Boolean(user.animatedAvatarEnabled)}
                          />
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-medium"
                              style={
                                user.usernameColor
                                  ? { color: user.usernameColor }
                                  : undefined
                              }
                            >
                              {user.displayName ?? user.username}
                              {user.statusEmoji ? ` ${user.statusEmoji}` : ""}
                            </p>
                            <p
                              className="truncate text-xs"
                              style={
                                user.usernameColor
                                  ? { color: user.usernameColor }
                                  : undefined
                              }
                            >
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-tepla-text-muted">
                            {matchingChat ? "Open" : "Start chat"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-tepla-text-muted">
                    No usernames matched this search yet.
                  </div>
                )}
              </div>
              {searchError ? (
                <p className="px-2 text-xs text-tepla-danger">{searchError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-0.5">
            {!isSidebarCollapsed && userSearchActive && favoriteChats.length === 0 ? (
              <div className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-tepla-text-muted">
                Chats
              </div>
            ) : null}
            {!isSidebarCollapsed && favoriteChats.length > 0 ? (
              <div className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                Favorites
              </div>
            ) : null}
            {(isSidebarCollapsed ? orderedChats : favoriteChats).map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                collapsed={isSidebarCollapsed}
                active={chat.id === activeChatId}
                online={chatSnapshots[chat.id]?.online}
                preview={chatSnapshots[chat.id]?.preview}
                updatedAt={chatSnapshots[chat.id]?.updatedAt}
                unreadCount={chatSnapshots[chat.id]?.unreadCount}
                pinned={pinnedChatIds.includes(chat.id)}
                favorite={isChatFavorite(chat)}
                onTogglePin={() => {
                  const isPinned = pinnedChatIds.includes(chat.id);
                  if (!isPinned && !canPinMoreChats) {
                    setSearchError(
                      `Pinned chats limit reached. Your current limit is ${MAX_PINNED_CHATS}.`,
                    );
                    return;
                  }

                  setSearchError(null);
                  togglePinnedChat(chat.id);
                }}
                onToggleFavorite={() => {
                  void (async () => {
                    try {
                      setSearchError(null);
                      if (backendEnabled) {
                        await onToggleFavoriteChat(chat.id, !isChatFavorite(chat));
                      } else {
                        toggleFavoriteChatLocal(chat.id);
                      }
                    } catch (favoriteError) {
                      setSearchError(
                        favoriteError instanceof Error
                          ? favoriteError.message
                          : "Failed to update favorites.",
                      );
                    }
                  })();
                }}
                onClick={() => onSelectChat(chat.id)}
              />
            ))}
            {!isSidebarCollapsed &&
            regularChats.length > 0 &&
            (favoriteChats.length > 0 || userSearchActive) ? (
              <div className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em] text-tepla-text-muted">
                Chats
              </div>
            ) : null}
            {!isSidebarCollapsed &&
            regularChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                collapsed={false}
                active={chat.id === activeChatId}
                online={chatSnapshots[chat.id]?.online}
                preview={chatSnapshots[chat.id]?.preview}
                updatedAt={chatSnapshots[chat.id]?.updatedAt}
                unreadCount={chatSnapshots[chat.id]?.unreadCount}
                pinned={pinnedChatIds.includes(chat.id)}
                favorite={isChatFavorite(chat)}
                onTogglePin={() => {
                  const isPinned = pinnedChatIds.includes(chat.id);
                  if (!isPinned && !canPinMoreChats) {
                    setSearchError(
                      `Pinned chats limit reached. Your current limit is ${MAX_PINNED_CHATS}.`,
                    );
                    return;
                  }

                  setSearchError(null);
                  togglePinnedChat(chat.id);
                }}
                onToggleFavorite={() => {
                  void (async () => {
                    try {
                      setSearchError(null);
                      if (backendEnabled) {
                        await onToggleFavoriteChat(chat.id, !isChatFavorite(chat));
                      } else {
                        toggleFavoriteChatLocal(chat.id);
                      }
                    } catch (favoriteError) {
                      setSearchError(
                        favoriteError instanceof Error
                          ? favoriteError.message
                          : "Failed to update favorites.",
                      );
                    }
                  })();
                }}
                onClick={() => onSelectChat(chat.id)}
              />
            ))}
            {orderedChats.length === 0 && !isSidebarCollapsed ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-3 py-5 text-center text-tepla-text-muted">
                {query.trim() ? (
                  <SearchIcon className="mx-auto mb-2 h-4 w-4" />
                ) : (
                  <Star className="mx-auto mb-2 h-4 w-4" />
                )}
                {query.trim()
                  ? "No chats match this search yet."
                  : "Mark chats as favorites to keep your most important conversations on top."}
              </div>
            ) : null}
            {searchError && !userSearchActive ? (
              <p className="px-3 py-2 text-xs text-tepla-danger">{searchError}</p>
            ) : null}
          </div>
        </ScrollArea>

        <div className="border-t border-tepla-border/70 p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              {!isSidebarCollapsed ? "Settings" : null}
            </Link>
          </Button>
        </div>
      </motion.aside>

      <CreateGroupDialog
        open={isCreateGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={onCreateGroup}
      />
    </>
  );
};
