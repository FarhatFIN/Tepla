"use client";
import { useTranslation } from "@/hooks/useTranslation";

export default function EmptyChat() {
  const t = useTranslation();
  const features = [
    t("e2e_encrypted"), t("voice_video_calls"), t("stories"), t("bots"), t("stickers"), t("auto_translate"),
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-main)] chat-wallpaper">
      <div className="relative z-[1] flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(91,33,182,0.25), rgba(108,61,232,0.25))" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#8B5CF6" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold gradient-text">{t("tepla")}</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{t("select_chat")}</p>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {features.map((f) => (
            <span key={f} className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
