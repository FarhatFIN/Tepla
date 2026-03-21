"use client";
import { FormEvent, useState } from "react";
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
  const { login } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
        </form>
      </div>
    </div>
  );
}
