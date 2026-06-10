"use client";
import { useMemo, useState } from "react";
import { Chat, ChatFolder } from "@/types";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";
import StoriesBar from "@/components/stories/StoriesBar";
import { useChatStore } from "@/stores/chat-store";
import { useShallow } from "zustand/react/shallow";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import NewChatModal from "@/components/chat/NewChatModal";

export default function Sidebar() {
  const { chats, activeChatId, setActiveChat, folders, activeFolderId, setActiveFolder, createFolder, stories, searchQuery, setSearchQuery, toggleSettings, toggleWallet, toggleWBIT, toggleArchive, togglePin, toggleMute, markAsRead } = useChatStore(useShallow(s => ({ chats: s.chats, activeChatId: s.activeChatId, setActiveChat: s.setActiveChat, folders: s.folders, activeFolderId: s.activeFolderId, setActiveFolder: s.setActiveFolder, createFolder: s.createFolder, stories: s.stories, searchQuery: s.searchQuery, setSearchQuery: s.setSearchQuery, toggleSettings: s.toggleSettings, toggleWallet: s.toggleWallet, toggleWBIT: s.toggleWBIT, toggleArchive: s.toggleArchive, togglePin: s.togglePin, toggleMute: s.toggleMute, markAsRead: s.markAsRead })));
  const { theme, toggleTheme } = useTheme();
  const t = useTranslation();
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"contact" | "group" | "channel">("contact");
  const [showArchived, setShowArchived] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);

  const archivedCount = useMemo(() => chats.filter((c) => c.isArchived).length, [chats]);

  const filteredChats = useMemo(() => {
    // Archive is a separate view (Telegram-style); search looks everywhere
    let list = searchQuery ? chats : chats.filter((c) => (showArchived ? c.isArchived : !c.isArchived));
    if (!showArchived && activeFolderId) {
      const folder = folders.find((f) => f.id === activeFolderId);
      if (folder) list = list.filter((c) => folder.chatIds.includes(c.id));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage?.text.toLowerCase().includes(q) || (c.user?.username && c.user.username.toLowerCase().includes(q)));
    }
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [chats, activeFolderId, folders, searchQuery, showArchived]);

  const totalMessages = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const blockingCount = chats.filter(c => (c.unreadCount || 0) > 3).length;
  const ctxChat = ctxMenu ? chats.find((c) => c.id === ctxMenu.chatId) : null;

  return (
    <aside className="flex h-full flex-col bg-[var(--bg-sidebar)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold gradient-text">{t("tepla")}</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label={t("theme")} onClick={toggleTheme} size="sm">
            {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </IconButton>
          <IconButton label="WBIT" onClick={toggleWBIT} size="sm">
            <span className="text-[10px] font-black bg-gradient-to-r from-[#8B5CF6] to-[#00D46A] bg-clip-text text-transparent">W</span>
          </IconButton>
          <IconButton label={t("wallet")} onClick={toggleWallet} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </IconButton>
          <IconButton label={t("settings")} onClick={toggleSettings} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </IconButton>
          <IconButton label={t("new_chat")} onClick={() => { setNewChatTab("contact"); setShowNewChat(!showNewChat); }} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </IconButton>
        </div>
      </header>

      {/* Quality metrics card */}
      <div className="mx-3 mt-3 mb-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🚀</span>
          <span className="text-xs font-semibold text-[var(--accent)]">{t("investor_demo")}</span>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalMessages || chats.length}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("messages")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{blockingCount}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("blocking")}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={t("search_chats")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Folder tabs (hidden inside the archive view) */}
      {!showArchived && (
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
          <button onClick={() => setActiveFolder(null)} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${!activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
            {t("all")}
          </button>
          {folders.map((f) => (
            <button key={f.id} onClick={() => setActiveFolder(f.id === activeFolderId ? null : f.id)} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${f.id === activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
              {f.icon} {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Archive entry / back row */}
      {!searchQuery && (showArchived ? (
        <button onClick={() => setShowArchived(false)} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{t("archived_chats") || "Archive"}</span>
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{archivedCount}</span>
        </button>
      ) : archivedCount > 0 && (
        <button onClick={() => setShowArchived(true)} className="flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-tertiary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">{t("archived_chats") || "Archive"}</span>
          <span className="ml-auto rounded-full bg-[var(--bg-input)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">{archivedCount}</span>
        </button>
      ))}

      {/* Chat list */}
      <nav className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && !searchQuery && !showArchived && (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <p className="text-sm text-[var(--text-tertiary)]">{t("no_chats")}</p>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={() => { setShowNewChat(true); setNewChatTab("contact"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(108,61,232,0.2)] text-[#8B5CF6]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("add_contact")}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{t("find_by_username")}</p>
                </div>
              </button>
              <button onClick={() => { setShowNewChat(true); setNewChatTab("group"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(0,212,106,0.15)] text-[#00D46A]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("create_group")}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{t("chat_with_team")}</p>
                </div>
              </button>
              <button onClick={() => { setShowNewChat(true); setNewChatTab("channel"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(139,92,246,0.2)] text-[#C4B5FD]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("create_channel")}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{t("broadcast_to_subs")}</p>
                </div>
              </button>
            </div>
          </div>
        )}
        {filteredChats.length === 0 && showArchived && !searchQuery && (
          <p className="px-6 py-10 text-center text-sm text-[var(--text-tertiary)]">{t("archive_empty") || "Archive is empty"}</p>
        )}
        {filteredChats.map((chat) => {
          // For direct chats, show the other user's info
          const displayName = chat.type === "direct" && chat.user?.name ? chat.user.name : chat.name;
          const displayAvatar = chat.type === "direct" && chat.user?.avatar ? chat.user.avatar : chat.avatar;
          const displayUsername = chat.type === "direct" && chat.user?.username ? chat.user.username : undefined;

          return (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ chatId: chat.id, x: e.clientX, y: e.clientY }); }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] ${activeChatId === chat.id ? "bg-[var(--bg-active)]" : ""}`}
            >
              <Avatar
                name={displayName}
                src={displayAvatar}
                status={chat.user?.status}
                size="md"
                showStatus={chat.type === "direct"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</span>
                    {/* Verified badge for user */}
                    {chat.type === "direct" && chat.user?.isVerified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="white" strokeWidth="2.5" className="shrink-0">
                        <circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13" fill="none"/>
                      </svg>
                    )}
                    {/* Verified badge for channels/bots */}
                    {(chat.type === "channel" || chat.type === "bot") && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="none" className="shrink-0">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        <circle cx="12" cy="12" r="11" fill="var(--accent)" opacity="0.2"/>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="var(--accent)"/>
                      </svg>
                    )}
                    {chat.isMuted && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" className="shrink-0">
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {chat.isPinned && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" className="shrink-0">
                        <path d="M12 2L12 22M12 2L8 6M12 2L16 6"/>
                      </svg>
                    )}
                    <span className="text-[10px] text-[var(--text-tertiary)]">{chat.lastMessage?.timestamp}</span>
                  </div>
                </div>
                {/* @handle — show actual username */}
                {displayUsername && (
                  <p className="truncate text-[11px] font-medium text-[var(--accent)] opacity-80">
                    @{displayUsername}
                  </p>
                )}
                <div className="flex items-center justify-between mt-0.5">
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {chat.lastMessage?.text || t("no_messages_yet")}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className={`ml-2 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${chat.isMuted ? "bg-[var(--text-tertiary)]" : "bg-[var(--accent)]"}`}>
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Chat context menu */}
      {ctxMenu && ctxChat && (
        <div className="fixed inset-0 z-50" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}>
          <div
            className="absolute w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-2xl animate-scale-in"
            style={{ left: Math.min(ctxMenu.x, typeof window !== "undefined" ? window.innerWidth - 200 : ctxMenu.x), top: Math.min(ctxMenu.y, typeof window !== "undefined" ? window.innerHeight - 200 : ctxMenu.y) }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { togglePin(ctxChat.id); setCtxMenu(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L12 22M12 2L8 6M12 2L16 6"/></svg>
              {ctxChat.isPinned ? (t("unpin_chat") || "Unpin") : (t("pin_chat") || "Pin")}
            </button>
            <button onClick={() => { toggleMute(ctxChat.id); setCtxMenu(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {ctxChat.isMuted ? (t("unmute_chat") || "Unmute") : (t("mute_chat") || "Mute")}
            </button>
            <button onClick={() => { markAsRead(ctxChat.id); setCtxMenu(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              {t("mark_as_read") || "Mark as read"}
            </button>
            <div className="mx-2 my-1 border-t border-[var(--border)]" />
            <button onClick={() => { toggleArchive(ctxChat.id); setCtxMenu(null); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              {ctxChat.isArchived ? (t("unarchive_chat") || "Unarchive") : (t("archive_chat") || "Archive")}
            </button>
          </div>
        </div>
      )}

      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} initialTab={newChatTab} />
    </aside>
  );
}
