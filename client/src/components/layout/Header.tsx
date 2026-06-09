"use client";
import { Chat } from "@/types";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";
import { useChatStore } from "@/stores/chat-store";
import { useTranslation } from "@/hooks/useTranslation";

interface HeaderProps { chat: Chat; onBack: () => void; onSearch: () => void; }

export default function Header({ chat, onBack, onSearch }: HeaderProps) {
  const { toggleProfile, toggleCalls, toggleTranslation } = useChatStore();
  const t = useTranslation();
  const user = chat.user;
  const statusText = chat.type === "direct"
    ? user?.status === "online" ? t("online") : user?.lastSeen ? t("last_seen", { time: user.lastSeen || "" }) : t("offline")
    : t("members_count", { count: chat.membersCount || 0 });

  return (
    <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5 transition-colors" style={{ backdropFilter: "blur(12px)" }}>
      <IconButton label={t("back")} onClick={onBack} className="md:hidden" size="sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </IconButton>

      <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3" onClick={toggleProfile}>
        <Avatar name={chat.name} src={chat.avatar} status={user?.status} size="sm" showStatus={chat.type === "direct"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-[var(--text-primary)]">{chat.name}</h2>
            {(chat.type === "channel" || chat.type === "group" || chat.type === "bot") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                {t("verified")}
              </span>
            )}
          </div>
          <p className={`text-xs ${user?.status === "online" ? "text-[#00D46A]" : "text-[var(--text-tertiary)]"}`}>
            {chat.typing && chat.typing.length > 0 ? (
              <span className="text-[var(--accent)]">{t("typing", { names: chat.typing.join(", ") })}</span>
            ) : statusText}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton label={t("auto_translate")} onClick={() => toggleTranslation(chat.id)} size="sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={chat.autoTranslate ? "var(--accent)" : "currentColor"} strokeWidth="2">
            <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
          </svg>
        </IconButton>
        <IconButton label={t("voice_call")} onClick={() => toggleCalls("voice")} size="sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </IconButton>
        <IconButton label={t("video_call")} onClick={() => toggleCalls("video")} size="sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </IconButton>
        <IconButton label={t("search")} onClick={onSearch} size="sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </IconButton>
        <IconButton label={t("info")} onClick={toggleProfile} size="sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </IconButton>
      </div>
    </header>
  );
}
