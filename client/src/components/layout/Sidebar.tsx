"use client";
import { useMemo, useState } from "react";
import { Chat, ChatFolder } from "@/types";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";
import StoriesBar from "@/components/stories/StoriesBar";
import { useChatStore } from "@/stores/chat-store";
import { useTheme } from "@/hooks/useTheme";
import NewChatModal from "@/components/chat/NewChatModal";

export default function Sidebar() {
  const { chats, activeChatId, setActiveChat, folders, activeFolderId, setActiveFolder, stories, searchQuery, setSearchQuery, toggleSettings, togglePremium } = useChatStore();
  const { theme, toggleTheme } = useTheme();
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"contact" | "group" | "channel">("contact");

  const filteredChats = useMemo(() => {
    let list = chats;
    if (activeFolderId) {
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
  }, [chats, activeFolderId, folders, searchQuery]);

  const chatTypeIcon = (chat: Chat) => {
    if (chat.type === "group") return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    if (chat.type === "channel") return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    if (chat.type === "bot") return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>;
    return null;
  };

  return (
    <aside className="flex h-full flex-col bg-[var(--bg-sidebar)] transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold gradient-text">Tepla</h1>
          <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">v2</span>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label="Theme" onClick={toggleTheme} size="sm">
            {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </IconButton>
          <IconButton label="Premium" onClick={togglePremium} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </IconButton>
          <IconButton label="Settings" onClick={toggleSettings} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </IconButton>
          <IconButton label="New Chat" onClick={() => { setNewChatTab("contact"); setShowNewChat(!showNewChat); }} size="sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </IconButton>
        </div>
      </header>

      {/* Stories */}
      <StoriesBar stories={stories} />

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-tertiary)]"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
        <button onClick={() => setActiveFolder(null)} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${!activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
          All
        </button>
        {folders.map((f) => (
          <button key={f.id} onClick={() => setActiveFolder(f.id === activeFolderId ? null : f.id)} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${f.id === activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
            {f.icon} {f.name}
          </button>
        ))}
      </div>

      {/* Chat list */}
      <nav className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <p className="text-sm text-[var(--text-tertiary)]">No chats yet. Get started!</p>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={() => { setShowNewChat(true); setNewChatTab("contact"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Add Contact</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Find people by username</p>
                </div>
              </button>
              <button onClick={() => { setShowNewChat(true); setNewChatTab("group"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Create Group</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Chat with your team or friends</p>
                </div>
              </button>
              <button onClick={() => { setShowNewChat(true); setNewChatTab("channel"); }} className="flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Create Channel</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Broadcast to subscribers</p>
                </div>
              </button>
            </div>
          </div>
        )}
        {filteredChats.map((chat) => (
          <button key={chat.id} onClick={() => setActiveChat(chat.id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] ${activeChatId === chat.id ? "bg-[var(--bg-active)]" : ""}`}>
            <Avatar
              name={chat.name}
              src={chat.avatar}
              status={chat.user?.status}
              size="md"
              isPremium={chat.user?.isPremium}
              showStatus={chat.type === "direct"}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {chatTypeIcon(chat)}
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">{chat.name}</span>
                  {chat.isMuted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>}
                </div>
                <div className="flex items-center gap-1">
                  {chat.isPinned && <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-tertiary)]"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>}
                  <span className="text-[10px] text-[var(--text-tertiary)]">{chat.lastMessage?.timestamp}</span>
                </div>
              </div>
              {chat.type === "direct" && chat.user?.username && (
                <p className="truncate text-[10px] text-[var(--text-tertiary)]">@{chat.user.username}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="truncate text-xs text-[var(--text-secondary)]">
                  {chat.lastMessage?.senderName && <span className="font-medium text-[var(--accent)]">{chat.lastMessage.senderName}: </span>}
                  {chat.lastMessage?.text}
                </p>
                {chat.unreadCount > 0 && (
                  <span className={`ml-2 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${chat.isMuted ? "bg-[var(--text-tertiary)]" : "bg-[var(--accent)]"}`}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </nav>
      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} initialTab={newChatTab} />
    </aside>
  );
}
