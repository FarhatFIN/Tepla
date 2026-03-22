"use client";
import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import Input from "@/components/ui/Input";
import { useTheme } from "@/hooks/useTheme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { login, switchAccount, removeSavedAccount, savedAccounts, hydrate } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { hydrate(); }, [hydrate]);

  const hasAccounts = savedAccounts.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) { setError("Enter a valid email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) router.push("/");
    else setError("Invalid credentials");
  }

  function handleSwitch(accountId: string) {
    switchAccount(accountId);
    router.push("/");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-[var(--bg-main)] px-4 py-8">
      <button onClick={toggleTheme} className="fixed top-4 right-4 z-10 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        {theme === "dark"
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold gradient-text">Tepla</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">Encrypted messenger for everyone</p>
      </div>

      {/* Saved accounts */}
      {hasAccounts && !showForm && (
        <div className="w-full max-w-sm mb-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Your accounts</p>
          <div className="flex flex-col gap-2">
            {savedAccounts.map((acc) => (
              <div key={acc.user.id} className="flex items-center gap-3 rounded-2xl bg-[var(--bg-sidebar)] p-3 shadow-lg">
                <button onClick={() => handleSwitch(acc.user.id)} className="flex flex-1 items-center gap-3 text-left hover:opacity-80 transition-opacity">
                  {acc.user.avatar ? (
                    <img src={acc.user.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                      {acc.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{acc.user.name}</p>
                      {acc.user.isVerified && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13" fill="none"/></svg>
                      )}
                      {acc.user.isAdmin && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold text-white">ADM</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">@{acc.user.username}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button onClick={() => removeSavedAccount(acc.user.id)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Remove account">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] py-3 text-sm text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add another account
          </button>
        </div>
      )}

      {/* Login form */}
      {(!hasAccounts || showForm) && (
        <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-sidebar)] p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-center text-xl font-semibold">Sign In</h2>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>}
            <Input label="Email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <Input label="Password" isPassword placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60">
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Sign In"}
            </button>
            <p className="text-center text-sm text-[var(--text-tertiary)]">
              No account? <Link href="/register" className="text-[var(--accent)] hover:underline">Register</Link>
            </p>
            {hasAccounts && (
              <button type="button" onClick={() => setShowForm(false)} className="text-center text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                Back to saved accounts
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
