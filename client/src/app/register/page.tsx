"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import Input from "@/components/ui/Input";
import { languages } from "@/lib/countries";
import { useTheme } from "@/hooks/useTheme";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [language, setLanguage] = useState("ru");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const { register } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  function validateUsername(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(clean);
    if (clean.length < 4) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const taken = ["admin", "tepla", "support", "help"];
    setTimeout(() => {
      setUsernameStatus(taken.includes(clean) ? "taken" : "available");
    }, 500);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name || name.length < 2) e.name = "Min 2 characters";
    if (!username || username.length < 4) e.username = "Min 4 characters";
    if (!/^[a-z0-9_]+$/.test(username)) e.username = "Only a-z, 0-9 and _";
    if (usernameStatus === "taken") e.username = "Username is already taken";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    if (confirm !== password) e.confirm = "Passwords don't match";
    return e;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGlobalError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const ok = await register(name, email, password, language, username);
    setLoading(false);
    if (ok) {
      router.push("/");
    } else {
      setGlobalError("Registration failed. Email or username may already be taken.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-main)] px-4">
      <button onClick={toggleTheme} className="absolute top-4 right-4 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        {theme === "dark"
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold gradient-text">Tepla</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">Create your account</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-sidebar)] p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold">Register</h2>

          {globalError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{globalError}</p>}

          <Input label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />

          {/* Username field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">@</span>
              <input
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => validateUsername(e.target.value)}
                maxLength={32}
                className={`w-full rounded-xl bg-[var(--bg-input)] py-2.5 pl-8 pr-10 text-sm outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:ring-2 ${errors.username ? "ring-2 ring-red-500" : "focus:ring-[var(--accent)]"}`}
              />
              {usernameStatus === "checking" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              )}
              {usernameStatus === "available" && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              {usernameStatus === "taken" && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              )}
            </div>
            {errors.username && <p className="text-xs text-red-400">{errors.username}</p>}
            {usernameStatus === "available" && <p className="text-[10px] text-emerald-400">Username is available!</p>}
            {usernameStatus === "taken" && <p className="text-[10px] text-red-400">Username is already taken</p>}
            <p className="text-[10px] text-[var(--text-tertiary)]">Others can find you by @{username || "username"}. Only a-z, 0-9, _</p>
          </div>

          <Input label="Email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />

          {/* Language selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">Auto-translate language</label>
            <div className="grid grid-cols-3 gap-1.5">
              {languages.slice(0, 9).map((lang) => (
                <button key={lang.code} type="button" onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors ${language === lang.code ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">Messages in other languages will be auto-translated to your selected language</p>
          </div>

          <Input label="Password" isPassword placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" />
          <Input label="Confirm password" isPassword placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" />

          <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60">
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Create Account"}
          </button>
          <p className="text-center text-sm text-[var(--text-tertiary)]">
            Already have an account? <Link href="/login" className="text-[var(--accent)] hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
