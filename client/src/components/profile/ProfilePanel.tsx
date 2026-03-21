"use client";
import { useState } from "react";
import { Chat } from "@/types";
import Avatar from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat-store";

interface ProfilePanelProps { chat: Chat; }

export default function ProfilePanel({ chat }: ProfilePanelProps) {
  const { toggleProfile } = useChatStore();
  const user = chat.user;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  const infoItems = [
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: "Phone", value: user?.phone || "+7 (900) 123-45-67", copyable: true },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "Username", value: user?.username ? `@${user.username}` : "Not set", copyable: !!user?.username },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, label: "Language", value: user?.language || "Russian", copyable: false },
  ];

  const actions = [
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: "Photos & Videos", count: 42 },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: "Files", count: 15 },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, label: "Links", count: 8 },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>, label: "Voice Messages", count: 3 },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--bg-sidebar)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold">Profile</h3>
        <button onClick={toggleProfile} className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar & name */}
        <div className="flex flex-col items-center gap-3 p-6">
          <Avatar name={chat.name} src={chat.avatar} status={user?.status} size="xl" isPremium={user?.isPremium} />
          <div className="text-center">
            <h2 className="text-lg font-semibold">{chat.name}</h2>
            <p className={`text-xs ${user?.status === "online" ? "text-emerald-400" : "text-[var(--text-tertiary)]"}`}>
              {user?.status === "online" ? "online" : user?.lastSeen ? `last seen ${user.lastSeen}` : `${chat.membersCount || 0} members`}
            </p>
          </div>
          {user?.bio && <p className="text-center text-sm text-[var(--text-secondary)]">{user.bio}</p>}
        </div>

        {/* Info */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          {infoItems.map((item) => (
            <button key={item.label} onClick={() => item.copyable && copyToClipboard(item.value, item.label)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${item.copyable ? "hover:bg-[var(--bg-hover)] cursor-pointer" : "cursor-default"}`}>
              <span className="text-[var(--text-tertiary)]">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">{item.value}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{item.label}</p>
              </div>
              {copiedField === item.label && <span className="text-[10px] text-emerald-400 shrink-0">Copied!</span>}
            </button>
          ))}
        </div>

        {/* Shared media */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          {actions.map((a) => (
            <button key={a.label} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]">
              <span className="text-[var(--text-tertiary)]">{a.icon}</span>
              <span className="flex-1 text-sm text-[var(--text-primary)]">{a.label}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{a.count}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>

        {/* Danger zone */}
        {chat.type === "direct" && (
          <div className="border-t border-[var(--border)] px-4 py-3">
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-red-400 transition-colors hover:bg-red-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              <span className="text-sm">Block user</span>
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-red-400 transition-colors hover:bg-red-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span className="text-sm">Delete chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
