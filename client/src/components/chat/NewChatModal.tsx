"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import api from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";
import { useTranslation } from "@/hooks/useTranslation";

type Tab = "contact" | "group" | "channel";

interface SearchUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export default function NewChatModal({ open, onClose, initialTab = "contact" }: Props) {
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<{ id: string; name: string; username?: string; description?: string; members_count?: number }[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  const loadChats = useChatStore((s) => s.loadChats);
  const setActiveChat = useChatStore((s) => s.setActiveChat);

  async function searchUsers() {
    if (search.length < 2) return;
    setSearching(true);
    setError("");
    try {
      console.log("[NewChatModal] searchUsers query:", search);
      const res = await api.get<{ success: boolean; data: any[] }>(`/users/search?q=${encodeURIComponent(search)}`);
      console.log("[NewChatModal] searchUsers response:", res.data);
      const users = (res.data || [])
        .map((user) => ({
          id: String(user.id || user.userId || user.user_id || ""),
          username: String(user.username || ""),
          displayName: user.displayName || user.display_name,
          avatarUrl: user.avatarUrl || user.avatar_url,
          isOnline: Boolean(user.isOnline ?? user.is_online),
        }))
        .filter((user) => user.id && user.username);
      setSearchResults(users);
      if (!users.length) {
        console.log("[NewChatModal] no users found");
        setError(t("no_users_found"));
      }
    } catch (err) {
      console.error("[NewChatModal] searchUsers error:", err);
      setError(t("search_failed"));
    }
    setSearching(false);
  }

  async function startDirectChat(user: SearchUser | null = selectedUser) {
    console.log("selectedUser", user);
    console.log("selectedUser.id", user?.id);
    if (!user?.id) {
      console.error("Missing selectedUser.id", user);
      setError(t("failed_create_chat"));
      return;
    }

    setCreating(true);
    setError("");
    try {
      const payload = { targetUserId: user.id };
      console.log("[NewChatModal] payload:", payload);

      const res = await api.post<{ success: boolean; data: any }>("/chats", payload);
      console.log("[NewChatModal] createChat response:", res);
      
      await loadChats();
      setActiveChat(res.data.id);
      onClose();
    } catch (err) {
      console.error("[NewChatModal] createChat error:", err);
      setError(t("failed_create_chat"));
    }
    setCreating(false);
  }

  async function createGroup() {
    if (!groupName.trim() || groupName.trim().length < 2) {
      setError(t("group_min_2"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; data: any }>("/chats", {
        type: "group",
        name: groupName.trim(),
      });
      await loadChats();
      setActiveChat(res.data.id);
      onClose();
    } catch {
      setError(t("failed_create_group"));
    }
    setCreating(false);
  }

  async function createChannel() {
    if (!channelName.trim() || channelName.trim().length < 2) {
      setError(t("channel_min_2"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; data: any }>("/chats", {
        type: "channel",
        name: channelName.trim(),
        username: channelUsername.trim() || undefined,
        description: channelDesc.trim() || undefined,
        isPublic: true,
      });
      await loadChats();
      setActiveChat(res.data.id);
      onClose();
    } catch {
      setError(t("failed_create_channel"));
    }
    setCreating(false);
  }

  async function searchChannels() {
    setDiscovering(true);
    setError("");
    try {
      const res = await api.get<{ success: boolean; data: any[] }>(`/channels/discover?q=${encodeURIComponent(discoverQuery)}`);
      setDiscoverResults(res.data || []);
    } catch {
      setError(t("search_failed"));
    }
    setDiscovering(false);
  }

  async function joinChannel(id: string) {
    setJoiningId(id);
    setError("");
    try {
      await api.post(`/channels/${id}/join`);
      await loadChats();
      setActiveChat(id);
      onClose();
    } catch {
      setError(t("failed_create_channel"));
    }
    setJoiningId(null);
  }

  function reset() {
    setSearch("");
    setSearchResults([]);
    setSelectedUser(null);
    setGroupName("");
    setChannelName("");
    setChannelUsername("");
    setChannelDesc("");
    setError("");
    setSuccess("");
    setDiscoverQuery("");
    setDiscoverResults([]);
    setJoiningId(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "contact",
      label: t("new_chat"),
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
    {
      id: "group",
      label: t("group"),
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      id: "channel",
      label: t("channel"),
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    },
  ];

  return (
    <Modal open={open} onClose={handleClose} title={t("create")}>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-input)] p-1 mb-4">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => { setTab(tb.id); setError(""); setSuccess(""); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${tab === tb.id ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">{error}</p>}
      {success && <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400">{success}</p>}

      {/* New Chat / Add Contact */}
      {tab === "contact" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">{t("find_user")}</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t("username_or_name")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              className="flex-1 rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              onClick={searchUsers}
              disabled={searching || search.length < 2}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {searching ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("search")}
            </button>
          </div>
          {/* Results */}
          <div className="max-h-60 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  startDirectChat(u);
                }}
                disabled={creating}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                    {(u.displayName || u.username || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.displayName || u.username}</p>
                  {u.username && <p className="truncate text-xs text-[var(--text-tertiary)]">@{u.username}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {u.isOnline && <div className="h-2 w-2 rounded-full bg-emerald-400" />}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Group */}
      {tab === "group" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">{t("group_chat_desc")}</p>
          <input
            type="text"
            placeholder={t("group_name")}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            onClick={createGroup}
            disabled={creating || !groupName.trim()}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {creating ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("create_group")}
          </button>
        </div>
      )}

      {/* Create Channel */}
      {tab === "channel" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">{t("channel_desc_create")}</p>
          <input
            type="text"
            placeholder={t("channel_name")}
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">@</span>
            <input
              type="text"
              placeholder={t("channel_link")}
              value={channelUsername}
              onChange={(e) => setChannelUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="w-full rounded-xl bg-[var(--bg-input)] py-2.5 pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <textarea
            placeholder={t("description_optional")}
            value={channelDesc}
            onChange={(e) => setChannelDesc(e.target.value)}
            rows={2}
            className="rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
          <button
            onClick={createChannel}
            disabled={creating || !channelName.trim()}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {creating ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("create_channel")}
          </button>

          {/* Discover public channels */}
          <div className="mt-1 border-t border-[var(--border)] pt-3">
            <p className="mb-2 text-xs text-[var(--text-tertiary)]">Find public channels</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Channel name or @username"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchChannels()}
                className="min-w-0 flex-1 rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                onClick={searchChannels}
                disabled={discovering}
                className="rounded-xl bg-[var(--bg-input)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {discovering ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /> : t("search")}
              </button>
            </div>
            {discoverResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                {discoverResults.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--bg-hover)]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                      {(ch.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ch.name}</p>
                      <p className="truncate text-xs text-[var(--text-tertiary)]">
                        {ch.username ? `@${ch.username} · ` : ""}{ch.members_count || 0} subscribers
                      </p>
                    </div>
                    <button
                      onClick={() => joinChannel(ch.id)}
                      disabled={joiningId === ch.id}
                      className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
                    >
                      {joiningId === ch.id ? "..." : "Join"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
