"use client";

export default function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-main)]">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-soft)]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Tepla Messenger</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">Select a chat to start messaging</p>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {["E2E Encrypted", "Voice & Video Calls", "Stories", "Bots", "Stickers", "Auto-Translate"].map((f) => (
          <span key={f} className="rounded-full bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-secondary)]">{f}</span>
        ))}
      </div>
    </div>
  );
}
