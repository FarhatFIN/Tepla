"use client";
import { useChatStore } from "@/stores/chat-store";

const features = [
  { icon: "\u{1F4E4}", title: "4 GB uploads", desc: "Send files up to 4 GB" },
  { icon: "\u{1F50A}", title: "Voice-to-text", desc: "Auto transcribe voice messages" },
  { icon: "\u{1F30D}", title: "Unlimited translation", desc: "Translate all messages instantly" },
  { icon: "\u{1F4F7}", title: "Stories", desc: "Up to 50 active stories" },
  { icon: "\u{1F3A8}", title: "Custom themes", desc: "Unlock exclusive themes" },
  { icon: "\u{1F3AD}", title: "Animated avatars", desc: "Set animated profile pictures" },
  { icon: "\u{1F4E2}", title: "Channels", desc: "Create unlimited channels" },
  { icon: "\u{1F916}", title: "Bots", desc: "Create up to 20 bots" },
  { icon: "\u{1F465}", title: "Group calls", desc: "Up to 100 participants" },
  { icon: "\u{1F4DD}", title: "Long messages", desc: "Up to 8000 characters" },
  { icon: "\u{1F50D}", title: "Advanced search", desc: "Filter by date, type, author" },
  { icon: "\u{26A1}", title: "Priority delivery", desc: "Messages delivered first" },
];

const plans = [
  { id: "1month", name: "1 месяц", price: "499 ₽", period: "/мес", popular: false },
  { id: "3months", name: "3 месяца", price: "999 ₽", period: "/3 мес", popular: false, savings: "333 ₽/мес" },
  { id: "6months", name: "6 месяцев", price: "1 499 ₽", period: "/6 мес", popular: true, savings: "250 ₽/мес" },
  { id: "1year", name: "1 год", price: "2 399 ₽", period: "/год", popular: false, savings: "200 ₽/мес" },
];

export default function PremiumPanel() {
  const { showPremium, togglePremium } = useChatStore();
  if (!showPremium) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center animate-fade-in" onClick={togglePremium}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(108,61,232,0.1) 0%, rgba(10,6,18,0.92) 70%)" }} />
      <div className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-scale-in" style={{ background: "rgba(19,13,36,0.95)", border: "1px solid rgba(108,61,232,0.25)" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={togglePremium} className="absolute top-4 right-4 rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--premium-gradient)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h2 className="text-2xl font-bold premium-text">Tepla Premium</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">Unlock the full power of Tepla</p>
        </div>

        {/* Features grid */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-[var(--bg-input)] p-3 text-center">
              <span className="text-2xl">{f.icon}</span>
              <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{f.title}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="flex gap-3 opacity-50 pointer-events-none select-none">
          {plans.map((p) => (
            <div key={p.id} className={`relative flex-1 rounded-xl border-2 p-4 text-center ${p.popular ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}>
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">BEST</span>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">{p.name}</p>
              <p className="mt-1 text-lg font-bold">{p.price}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{p.period}</p>
              {p.savings && <p className="mt-1 text-[10px] font-semibold text-[#00D46A]">{p.savings}</p>}
            </div>
          ))}
        </div>

        {/* В разработке */}
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-input)] py-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Premium в разработке</p>
          <p className="text-xs text-[var(--text-tertiary)]">Скоро будет доступно. Следите за обновлениями!</p>
        </div>
      </div>
    </div>
  );
}
