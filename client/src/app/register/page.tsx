"use client";
import { FormEvent, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import Input from "@/components/ui/Input";
import OtpInput from "@/components/ui/OtpInput";
import { languages } from "@/lib/countries";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

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

  // OTP step
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  const { register, verifyOtp, resendCode } = useAuthStore();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslation();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
    if (!name || name.length < 2) e.name = t("min_2_chars");
    if (!username || username.length < 4) e.username = t("min_4_chars");
    if (!/^[a-z0-9_]+$/.test(username)) e.username = t("only_az_09");
    if (usernameStatus === "taken") e.username = t("username_taken");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("enter_valid_email");
    if (!password || password.length < 6) e.password = t("password_min_6");
    if (confirm !== password) e.confirm = t("passwords_dont_match");
    return e;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setGlobalError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const result = await register(name, email, password, language, username);
      if (result.ok) {
        router.push("/");
      } else if (result.needsOtp) {
        setOtpEmail(result.email || email);
        setOtpStep(true);
        setResendCooldown(60);
      }
    } catch {
      setGlobalError(t("registration_failed"));
    }
    setLoading(false);
  }

  const handleOtpComplete = useCallback(async (code: string) => {
    setOtpError("");
    setOtpLoading(true);
    try {
      const ok = await verifyOtp(otpEmail, code, "register");
      if (ok) router.push("/");
    } catch {
      setOtpError(t("invalid_code"));
    }
    setOtpLoading(false);
  }, [otpEmail, verifyOtp, router, t]);

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendMessage("");
    try {
      await resendCode(otpEmail);
      setResendMessage(t("new_code_sent"));
      setResendCooldown(60);
    } catch {
      setOtpError(t("too_many_attempts"));
    }
  }

  // OTP verification screen
  if (otpStep) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-[var(--bg-main)] px-4 py-8">
        <button onClick={toggleTheme} className="fixed top-4 right-4 z-10 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
          {theme === "dark"
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
        </button>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text">Tepla</h1>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-sidebar)] p-6 shadow-lg">
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <polyline points="22,7 12,13 2,7"/>
              </svg>
            </div>

            <h2 className="text-xl font-semibold">{t("verify_email")}</h2>
            <p className="text-center text-sm text-[var(--text-tertiary)]">
              {t("code_sent_to")} <span className="font-medium text-[var(--text-primary)]">{otpEmail}</span>
            </p>

            {otpError && <p className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{otpError}</p>}
            {resendMessage && <p className="w-full rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-400">{resendMessage}</p>}

            <OtpInput onComplete={handleOtpComplete} disabled={otpLoading} />

            {otpLoading && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                {t("verifying")}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-[var(--accent)] hover:underline disabled:text-[var(--text-tertiary)] disabled:no-underline transition-colors"
            >
              {resendCooldown > 0 ? t("resend_in", { seconds: resendCooldown }) : t("resend_code")}
            </button>

            <button
              onClick={() => { setOtpStep(false); setOtpError(""); setResendMessage(""); }}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
            >
              {t("back_to_saved")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-[var(--bg-main)] px-4 py-8">
      <button onClick={toggleTheme} className="fixed top-4 right-4 z-10 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        {theme === "dark"
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold gradient-text">Tepla</h1>
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">{t("create_your_account")}</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-sidebar)] p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-center text-xl font-semibold">{t("register")}</h2>

          {globalError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{globalError}</p>}

          <Input label={t("name")} placeholder={t("your_name")} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />

          {/* Username field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">{t("username")}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">@</span>
              <input
                type="text"
                placeholder={t("your_username")}
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
            {usernameStatus === "available" && <p className="text-[10px] text-emerald-400">{t("username_available")}</p>}
            {usernameStatus === "taken" && <p className="text-[10px] text-red-400">{t("username_taken")}</p>}
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("username_hint", { username: username || "username" })}</p>
          </div>

          <Input label={t("email")} type="email" placeholder={t("your_email")} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />

          {/* Language selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">{t("auto_translate_lang")}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {languages.slice(0, 9).map((lang) => (
                <button key={lang.code} type="button" onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors ${language === lang.code ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("auto_translate_hint")}</p>
          </div>

          <Input label={t("password")} isPassword placeholder={t("min_6_chars")} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" />
          <Input label={t("confirm_password")} isPassword placeholder={t("repeat_password")} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} autoComplete="new-password" />

          <button type="submit" disabled={loading} className="mt-2 flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60">
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("create_account")}
          </button>
          <p className="text-center text-sm text-[var(--text-tertiary)]">
            {t("already_have_account")} <Link href="/login" className="text-[var(--accent)] hover:underline">{t("sign_in")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
