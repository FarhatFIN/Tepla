"use client";
import { FormEvent, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import OtpInput from "@/components/ui/OtpInput";
import { useTranslation } from "@/hooks/useTranslation";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const inputClass =
  "w-full h-[54px] bg-transparent border-b border-[#1E2D3D] text-[#E8EDF2] placeholder:text-[#4A6480] px-0 text-[16px] outline-none transition-all focus:border-[#3390EC]";
type BinaryShieldIssue = {
  seedPhrase?: string;
  recoveryPatterns: Array<{ id: string; pattern: string; usesLeft: number }>;
  nextManualRotationAt: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpType, setOtpType] = useState<"login" | "verify">("login");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [binaryShield, setBinaryShield] = useState<BinaryShieldIssue | null>(null);

  const { login, verifyOtp, resendCode, switchAccount, removeSavedAccount, savedAccounts, hydrate } = useAuthStore();
  const router = useRouter();
  const t = useTranslation();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const hasAccounts = savedAccounts.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) { setError(t("enter_valid_email")); return; }
    if (!password || password.length < 6) { setError(t("password_min_6")); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        if (result.binaryShield) {
          setBinaryShield(result.binaryShield);
          setLoading(false);
          return;
        }
        router.push("/");
      } else if (result.needsOtp || result.needsVerification) {
        setOtpEmail(result.email || email);
        setOtpType(result.needsVerification ? "verify" : "login");
        setOtpStep(true);
        setResendCooldown(60);
      }
    } catch {
      setError(t("invalid_credentials"));
    }
    setLoading(false);
  }

  const handleOtpComplete = useCallback(async (code: string) => {
    setOtpError("");
    setOtpLoading(true);
    try {
      const ok = await verifyOtp(otpEmail, code, otpType);
      if (ok) router.push("/");
    } catch {
      setOtpError(t("invalid_code"));
    }
    setOtpLoading(false);
  }, [otpEmail, otpType, verifyOtp, router, t]);

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

  function handleSwitch(accountId: string) {
    switchAccount(accountId);
    router.push("/");
  }

  if (binaryShield) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0E1621]">
        <div className="flex min-h-full w-full max-w-[420px] flex-col justify-center px-4 py-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <div className="mb-8 flex flex-col items-center">
              <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#152232]">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="1.4"><path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z"/><path d="M9 12l2 2 4-5"/></svg>
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">Binary Shield updated</h1>
              <p className="mt-2 text-center text-[14px] leading-relaxed text-[#6B8CAE]">Old recovery patterns are invalid now. Save the new one-time A/B patterns.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {binaryShield.recoveryPatterns.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#1E2D3D] bg-[#101B29] p-3">
                  <p className="font-mono text-[15px] tracking-[0.12em] text-[#E8EDF2]">{item.pattern}</p>
                  <p className="mt-1 text-[11px] text-[#4A6480]">uses: {item.usesLeft}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.push("/")} className="mt-8 h-[48px] w-full rounded-lg bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
              Continue
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // OTP screen
  if (otpStep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0E1621]">
        <div className="flex min-h-full w-full max-w-[360px] flex-col items-center justify-center px-4 py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
          <div className="flex flex-col items-center">
            <button onClick={() => { setOtpStep(false); setOtpError(""); }} className="self-start mb-8 text-[#4A6480] hover:text-[#E8EDF2] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>

            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#152232]">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#3390EC" strokeWidth="1.2"><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="22,7 12,13 2,7"/></svg>
            </div>

            <h1 className="mt-6 text-2xl font-semibold text-[#E8EDF2]">{t("verify_email")}</h1>
            <p className="mt-3 text-center text-[14px] leading-relaxed text-[#6B8CAE]">
              {t("code_sent_to")} <span className="text-[#E8EDF2]">{otpEmail}</span>
            </p>

            {otpError && <p className="mt-4 text-sm text-[#EF4444]">{otpError}</p>}
            {resendMessage && <p className="mt-4 text-sm text-[#00D46A]">{resendMessage}</p>}

            <div className="mt-8">
              <OtpInput onComplete={handleOtpComplete} disabled={otpLoading} />
            </div>

            {otpLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-[#6B8CAE]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3390EC] border-t-transparent" />
                {t("verifying")}
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-[13px] text-[#4A6480]">{t("didnt_receive")}</p>
              <button onClick={handleResend} disabled={resendCooldown > 0} className="mt-1 text-[14px] text-[#3390EC] hover:text-[#5EAEF0] disabled:text-[#4A6480] transition-colors">
                {resendCooldown > 0 ? t("resend_in", { seconds: resendCooldown }) : t("resend_code")}
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0E1621]">
      <div className="flex min-h-full w-full max-w-[360px] flex-col items-center justify-center px-4 py-8">
      <AnimatePresence mode="wait">
        <motion.div key="login" initial="hidden" animate="visible" exit="exit" variants={fadeUp} className="w-full">
          {/* Logo */}
          <div className="mb-12 flex flex-col items-center">
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#152232]">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#3390EC"/>
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[#E8EDF2]">Tepla</h1>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-[#6B8CAE]">{t("encrypted_messenger")}</p>
          </div>

          {/* Saved accounts */}
          {hasAccounts && !showForm && (
            <div className="mb-6">
              <div className="flex flex-col gap-2">
                {savedAccounts.map((acc, i) => (
                  <motion.div key={acc.user.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-xl p-3 hover:bg-[#152232] transition-colors">
                    <button onClick={() => handleSwitch(acc.user.id)} className="flex flex-1 items-center gap-3 text-left">
                      {acc.user.avatar ? (
                        <img src={acc.user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3390EC] text-sm font-semibold text-white">
                          {acc.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#E8EDF2]">{acc.user.name}</p>
                        <p className="truncate text-[13px] text-[#6B8CAE]">@{acc.user.username}</p>
                      </div>
                    </button>
                    <button onClick={() => removeSavedAccount(acc.user.id)} className="shrink-0 rounded-lg p-2 text-[#4A6480] hover:text-[#EF4444] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => setShowForm(true)} className="mt-4 w-full py-3 text-[14px] text-[#3390EC] hover:text-[#5EAEF0] transition-colors">
                {t("add_another_account")}
              </button>
            </div>
          )}

          {/* Login form */}
          {(!hasAccounts || showForm) && (
            <div>
              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center text-[14px] text-[#EF4444]">{error}</motion.p>}

              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="relative">
                  <input type="email" placeholder={t("email_or_username")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />
                </div>

                <div className="relative mt-2">
                  <input type={showPassword ? "text" : "password"} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#4A6480] hover:text-[#6B8CAE] transition-colors">
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                <div className="mt-4 flex justify-end">
                  <Link href="/forgot-password" className="text-[13px] text-[#3390EC] hover:text-[#5EAEF0] transition-colors">{t("forgot_password")}</Link>
                </div>

                <button type="submit" disabled={loading} className="mt-8 h-[48px] w-full rounded-lg bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-50">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : t("sign_in")}
                </button>

                <p className="mt-6 text-center text-[14px] text-[#6B8CAE]">
                  {t("no_account")}{" "}
                  <Link href="/register" className="text-[#3390EC] hover:text-[#5EAEF0] transition-colors">{t("register")}</Link>
                </p>

                {hasAccounts && (
                  <button type="button" onClick={() => setShowForm(false)} className="mt-3 text-center text-[13px] text-[#4A6480] hover:text-[#6B8CAE] transition-colors">
                    {t("back_to_saved")}
                  </button>
                )}
              </form>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
