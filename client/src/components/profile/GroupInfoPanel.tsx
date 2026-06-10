"use client";
import { useEffect, useState } from "react";
import { Chat } from "@/types";
import Avatar from "@/components/ui/Avatar";
import api from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";

interface SearchUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface GroupInfoPanelProps {
  chat: Chat;
}

const roleLabel: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export default function GroupInfoPanel({ chat }: GroupInfoPanelProps) {
  const { toggleProfile, loadMembers, leaveChat, loadChats } = useChatStore();
  const members = useChatStore((s) => s.members[chat.id] || []);
  const myId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(chat.name);
  const [error, setError] = useState("");

  const myRole = members.find((m) => m.userId === myId)?.role;
  const isOwner = myRole === "owner";
  const isAdmin = isOwner || myRole === "admin";
  const isChannel = chat.type === "channel";

  useEffect(() => {
    loadMembers(chat.id);
    setName(chat.name);
    setEditingName(false);
    setSearch("");
    setResults([]);
    setError("");
  }, [chat.id, chat.name, loadMembers]);

  async function searchUsers() {
    if (search.length < 2) return;
    setError("");
    try {
      const res = await api.get<{ success: boolean; data: any[] }>(`/users/search?q=${encodeURIComponent(search)}`);
      const memberIds = new Set(members.map((m) => m.userId));
      setResults(
        (res.data || [])
          .map((u: any) => ({
            id: String(u.id || u.userId || u.user_id || ""),
            username: String(u.username || ""),
            displayName: u.displayName || u.display_name,
            avatarUrl: u.avatarUrl || u.avatar_url,
          }))
          .filter((u) => u.id && !memberIds.has(u.id))
      );
    } catch {
      setError("Search failed");
    }
  }

  async function addMember(userId: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/groups/${chat.id}/members`, { userIds: [userId] });
      setResults((r) => r.filter((u) => u.id !== userId));
      await loadMembers(chat.id);
      loadChats();
    } catch {
      setError("Failed to add member");
    }
    setBusy(false);
  }

  async function removeMember(userId: string) {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/groups/${chat.id}/members/${userId}`);
      await loadMembers(chat.id);
      loadChats();
    } catch {
      setError("Failed to remove member");
    }
    setBusy(false);
  }

  async function setRole(userId: string, role: "admin" | "member") {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/groups/${chat.id}/members/${userId}/role`, { role });
      await loadMembers(chat.id);
    } catch {
      setError("Failed to change role");
    }
    setBusy(false);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === chat.name) {
      setEditingName(false);
      setName(chat.name);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.patch(`/chats/${chat.id}`, { name: trimmed });
      setEditingName(false);
      loadChats();
    } catch {
      setError("Failed to rename");
    }
    setBusy(false);
  }

  async function onLeave() {
    setBusy(true);
    setError("");
    try {
      await leaveChat(chat.id);
    } catch {
      setError("Failed to leave");
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-sidebar)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold">{isChannel ? "Channel info" : "Group info"}</h2>
        <button onClick={toggleProfile} aria-label="Close" className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Identity */}
        <div className="flex flex-col items-center gap-2 px-4 py-5">
          <Avatar name={chat.name} src={chat.avatar} size="lg" showStatus={false} />
          {editingName ? (
            <div className="flex w-full items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setName(chat.name); } }}
                autoFocus
                className="min-w-0 flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button onClick={saveName} disabled={busy} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">OK</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold">{chat.name}</h3>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} aria-label="Rename" className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-[var(--text-tertiary)]">
            {members.length || chat.membersCount || 0} {isChannel ? "subscribers" : "members"}
          </p>
          {chat.description && <p className="text-center text-xs text-[var(--text-secondary)]">{chat.description}</p>}
        </div>

        {error && <p className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">{error}</p>}

        {/* Add members (admins) */}
        {isAdmin && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{isChannel ? "Add subscribers" : "Add members"}</p>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                placeholder="Search users..."
                className="min-w-0 flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button onClick={searchUsers} disabled={search.length < 2} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Find</button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto">
                {results.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-hover)]">
                    <Avatar name={u.displayName || u.username} src={u.avatarUrl} size="sm" showStatus={false} />
                    <span className="min-w-0 flex-1 truncate text-sm">{u.displayName || u.username}</span>
                    <button onClick={() => addMember(u.id)} disabled={busy} className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-50">Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members list */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{isChannel ? "Subscribers" : "Members"}</p>
          {members.length === 0 && <p className="py-4 text-center text-xs text-[var(--text-tertiary)]">Loading members...</p>}
          {members.map((m) => (
            <div key={m.userId} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-hover)]">
              <Avatar name={m.user.name} src={m.user.avatar} size="sm" showStatus={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{m.user.name}{m.userId === myId ? " (you)" : ""}</p>
                {m.user.username && <p className="truncate text-[11px] text-[var(--text-tertiary)]">@{m.user.username}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${m.role === "owner" ? "bg-amber-500/15 text-amber-400" : m.role === "admin" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`}>
                {roleLabel[m.role] || m.role}
              </span>
              {m.userId !== myId && m.role !== "owner" && (
                <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                  {isOwner && (
                    <button
                      onClick={() => setRole(m.userId, m.role === "admin" ? "member" : "admin")}
                      disabled={busy}
                      title={m.role === "admin" ? "Demote to member" : "Promote to admin"}
                      className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => removeMember(m.userId)} disabled={busy} title="Remove" className="rounded p-1 text-[var(--text-tertiary)] hover:text-red-400 disabled:opacity-50">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave */}
      {!isOwner && myRole && (
        <div className="border-t border-[var(--border)] p-3">
          <button onClick={onLeave} disabled={busy} className="w-full rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50">
            {isChannel ? "Unsubscribe" : "Leave group"}
          </button>
        </div>
      )}
    </div>
  );
}
