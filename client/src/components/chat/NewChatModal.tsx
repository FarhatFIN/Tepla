"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import api from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";

type Tab = "contact" | "group" | "channel";

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export default function NewChatModal({ open, onClose, initialTab = "contact" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  const loadChats = useChatStore((s) => s.loadChats);
  const setActiveChat = useChatStore((s) => s.setActiveChat);

  async function searchUsers() {
    if (search.length < 2) return;
    setSearching(true);
    setError("");
    try {
      const res = await api.get<{ success: boolean; data: any[] }>(`/users/search?q=${encodeURIComponent(search)}`);
      setSearchResults(res.data || []);
      if (!res.data?.length) setError("No users found");
    } catch {
      setError("Search failed");
    }
    setSearching(false);
  }

  async function startDirectChat(userId: string) {
    setCreating(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; data: any }>("/chats", {
        type: "direct",
        memberIds: [userId],
      });
      await loadChats();
      setActiveChat(res.data.id);
      onClose();
    } catch {
      setError("Failed to create chat");
    }
    setCreating(false);
  }

  async function createGroup() {
    if (!groupName.trim() || groupName.trim().length < 2) {
      setError("Group name must be at least 2 characters");
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
      setError("Failed to create group");
    }
    setCreating(false);
  }

  async function createChannel() {
    if (!channelName.trim() || channelName.trim().length < 2) {
      setError("Channel name must be at least 2 characters");
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
      setError("Failed to create channel");
    }
    setCreating(false);
  }

  function reset() {
    setSearch("");
    setSearchResults([]);
    setGroupName("");
    setChannelName("");
    setChannelUsername("");
    setChannelDesc("");
    setError("");
    setSuccess("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "contact",
      label: "New Chat",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
    {
      id: "group",
      label: "Group",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      id: "channel",
      label: "Channel",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    },
  ];

  return (
    <Modal open={open} onClose={handleClose} title="Create">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-input)] p-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(""); setSuccess(""); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${tab === t.id ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">{error}</p>}
      {success && <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400">{success}</p>}

      {/* New Chat / Add Contact */}
      {tab === "contact" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">Find user by username or name</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="@username or name..."
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
              {searching ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Search"}
            </button>
          </div>
          {/* Results */}
          <div className="max-h-60 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => startDirectChat(u.id)}
                disabled={creating}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {(u.display_name || u.username || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.display_name || u.username}</p>
                  {u.username && <p className="truncate text-xs text-[var(--text-tertiary)]">@{u.username}</p>}
                </div>
                {u.is_online && <div className="h-2 w-2 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Group */}
      {tab === "group" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">Create a group chat for your team or friends</p>
          <input
            type="text"
            placeholder="Group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            onClick={createGroup}
            disabled={creating || !groupName.trim()}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {creating ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Create Group"}
          </button>
        </div>
      )}

      {/* Create Channel */}
      {tab === "channel" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">Create a public channel to broadcast messages</p>
          <input
            type="text"
            placeholder="Channel name..."
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">@</span>
            <input
              type="text"
              placeholder="channel_link (optional)"
              value={channelUsername}
              onChange={(e) => setChannelUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="w-full rounded-xl bg-[var(--bg-input)] py-2.5 pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <textarea
            placeholder="Description (optional)"
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
            {creating ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Create Channel"}
          </button>
        </div>
      )}
    </Modal>
  );
}
