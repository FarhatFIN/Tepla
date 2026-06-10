"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import OtpInput from "@/components/ui/OtpInput";
import { useTranslation } from "@/hooks/useTranslation";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

const slideVariants = {
  enter: { opacity: 0, x: 28 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

const inputClass =
  "h-[52px] w-full rounded-xl border border-[#1E2D3D] bg-[#101B29] px-4 text-[15px] text-[#E8EDF2] outline-none transition-all placeholder:text-[#4A6480] focus:border-[#3390EC] focus:ring-2 focus:ring-[#3390EC]/20";

type BinaryShieldIssue = {
  seedPhrase?: string;
  recoveryPatterns: Array<{ id: string; pattern: string; usesLeft: number }>;
  nextManualRotationAt: string;
};

type BinaryChallenge = {
  challengeId: string;
  code: string;
  expiresIn: number;
};

type LoginStep = 0 | 1;

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex ${compact ? "h-16 w-16" : "h-24 w-24"} items-center justify-center rounded-full bg-[#152232] shadow-[0_20px_60px_rgba(51,144,236,0.12)]`}>
      <Sparkles className={compact ? "h-7 w-7 text-[#3390EC]" : "h-10 w-10 text-[#3390EC]"} strokeWidth={1.7} />
    </div>
  );
}

function StepDots({ step }: { step: LoginStep }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1].map((item) => (
        <span
          key={item}
          className={`h-1.5 rounded-full transition-all ${step === item ? "w-8 bg-[#3390EC]" : "w-2 bg-[#1E2D3D]"}`}
        />
      ))}
    </div>
  );
}

function FieldShell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#4A6480]">{icon}</div>
      {children}
    </div>
  );
}

function isValidIdentity(value: string) {
  const clean = value.trim();
  if (!clean) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return true;
  return /^[a-zA-Z0-9_]{3,32}$/.test(clean);
}

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>(0);
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpType, setOtpType] = useState<"login" | "verify">("login");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [binaryShield, setBinaryShield] = useState<BinaryShieldIssue | null>(null);
  const [binaryChallenge, setBinaryChallenge] = useState<BinaryChallenge | null>(null);
  const [binaryCode, setBinaryCode] = useState("");
  const [binaryError, setBinaryError] = useState("");

  const {
    login,
    verifyOtp,
    verifyBinaryShield,
    resendCode,
    switchAccount,
    removeSavedAccount,
    savedAccounts,
    hydrate,
  } = useAuthStore();
  const router = useRouter();
  const t = useTranslation();
  const hasAccounts = savedAccounts.length > 0;

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function goToPassword(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (!isValidIdentity(identity)) {
      setError(t("email_or_username"));
      return;
    }
    setStep(1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!isValidIdentity(identity)) {
      setStep(0);
      setError(t("email_or_username"));
      return;
    }
    if (!password || password.length < 6) {
      setError(t("password_min_6"));
      return;
    }

    setLoading(true);
    try {
      const result = await login(identity.trim(), password);
      if (result.ok) {
        if (result.binaryShield) {
          setBinaryShield(result.binaryShield);
          setLoading(false);
          return;
        }
        router.push("/");
      } else if (result.requiresBinaryShield && result.binaryChallenge) {
        setBinaryChallenge(result.binaryChallenge);
      } else if (result.needsOtp || result.needsVerification) {
        setOtpEmail(result.email || identity);
        setOtpType(result.needsVerification ? "verify" : "login");
        setOtpStep(true);
        setResendCooldown(60);
      }
    } catch {
      setError(t("invalid_credentials"));
    }
    setLoading(false);
  }

  async function handleBinarySubmit(event: FormEvent) {
    event.preventDefault();
    if (!binaryChallenge) return;
    setBinaryError("");
    setLoading(true);
    try {
      const result = await verifyBinaryShield(binaryChallenge.challengeId, binaryCode);
      if (result.binaryShield) {
        setBinaryShield(result.binaryShield);
        setBinaryChallenge(null);
      } else {
        router.push("/");
      }
    } catch {
      setBinaryError("Invalid Binary Shield code");
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
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0B111A]">
        <div className="flex min-h-full w-full max-w-[440px] flex-col justify-center px-4 py-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <div className="mb-8 flex flex-col items-center text-center">
              <LogoMark compact />
              <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">Binary Shield updated</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B8CAE]">Old recovery patterns are invalid now. Save the new one-time A/B patterns.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {binaryShield.recoveryPatterns.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#1E2D3D] bg-[#101B29] p-3">
                  <p className="font-mono text-[15px] tracking-[0.12em] text-[#E8EDF2]">{item.pattern}</p>
                  <p className="mt-1 text-[11px] text-[#4A6480]">uses: {item.usesLeft}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.push("/")} className="mt-8 h-[48px] w-full rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
              Continue
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (binaryChallenge) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0B111A]">
        <div className="flex min-h-full w-full max-w-[380px] flex-col items-center justify-center px-4 py-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <div className="mb-8 flex flex-col items-center text-center">
              <LogoMark compact />
              <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">Binary Shield</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B8CAE]">Enter the one-time Binary code to finish sign in.</p>
            </div>
            <div className="mb-5 rounded-xl border border-[#1E2D3D] bg-[#101B29] p-4 text-center">
              <p className="mb-2 text-[12px] uppercase text-[#4A6480]">Binary code</p>
              <p className="font-mono text-[20px] tracking-[0.12em] text-[#E8EDF2]">{binaryChallenge.code}</p>
            </div>
            <form onSubmit={handleBinarySubmit} className="flex flex-col">
              <input inputMode="numeric" placeholder="Enter Binary code" value={binaryCode} onChange={(event) => setBinaryCode(event.target.value.replace(/\D/g, "").slice(0, 12))} className={inputClass} />
              {binaryError && <p className="mt-3 text-center text-[14px] text-[#EF4444]">{binaryError}</p>}
              <button type="submit" disabled={loading || binaryCode.length !== 12} className="mt-8 h-[48px] w-full rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-50">
                {loading ? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Verify"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0B111A]">
        <div className="flex min-h-full w-full max-w-[380px] flex-col items-center justify-center px-4 py-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <button onClick={() => { setOtpStep(false); setOtpError(""); }} className="mb-8 rounded-full p-2 text-[#4A6480] transition-colors hover:bg-[#152232] hover:text-[#E8EDF2]">
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <LogoMark />
              <h1 className="mt-6 text-2xl font-semibold text-[#E8EDF2]">{t("verify_email")}</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6B8CAE]">
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
                <button onClick={handleResend} disabled={resendCooldown > 0} className="mt-1 text-[14px] text-[#3390EC] transition-colors hover:text-[#5EAEF0] disabled:text-[#4A6480]">
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B111A]">
      <div className="mx-auto flex min-h-full w-full max-w-[410px] flex-col px-4 py-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex min-h-full flex-1 flex-col">
          <div className="flex items-center justify-between">
            {step === 1 ? (
              <button type="button" onClick={() => { setStep(0); setError(""); }} className="rounded-full p-2 text-[#4A6480] transition-colors hover:bg-[#152232] hover:text-[#E8EDF2]" aria-label={t("back")}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="h-9 w-9" />
            )}
            <StepDots step={step} />
            <span className="w-9 text-right text-[12px] font-medium text-[#4A6480]">{step + 1}/2</span>
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <LogoMark compact={step === 1} />
            <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">{step === 0 ? "Tepla" : t("sign_in_title")}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B8CAE]">
              {step === 0 ? t("encrypted_messenger") : identity}
            </p>
          </div>

          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center text-[14px] text-[#EF4444]">{error}</motion.p>}

          <div className="mt-8 flex flex-1 flex-col">
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div key="identity" variants={slideVariants} initial="enter" animate="center" exit="exit" className="flex flex-col gap-4">
                  {hasAccounts && (
                    <div className="flex flex-col gap-2">
                      {savedAccounts.map((account, index) => (
                        <motion.div
                          key={account.user.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="flex items-center gap-3 rounded-xl border border-[#1E2D3D] bg-[#101B29] p-3 transition-colors hover:border-[#2B4966]"
                        >
                          <button onClick={() => handleSwitch(account.user.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            {account.user.avatar ? (
                              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                                <Image src={account.user.avatar} alt="" fill sizes="44px" className="object-cover" unoptimized />
                              </span>
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3390EC] text-sm font-semibold text-white">
                                {account.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-medium text-[#E8EDF2]">{account.user.name}</p>
                              <p className="truncate text-[13px] text-[#6B8CAE]">@{account.user.username || account.user.id}</p>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-[#4A6480]" />
                          </button>
                          <button onClick={() => removeSavedAccount(account.user.id)} className="rounded-lg p-2 text-[#4A6480] transition-colors hover:bg-[#152232] hover:text-[#EF4444]" aria-label={t("remove_account")}>
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={goToPassword} className="flex flex-col gap-4">
                    <FieldShell icon={identity.includes("@") ? <Mail className="h-4 w-4" /> : <AtSign className="h-4 w-4" />}>
                      <input
                        value={identity}
                        onChange={(event) => { setIdentity(event.target.value); setError(""); }}
                        placeholder={t("email_or_username")}
                        className={`${inputClass} pl-11`}
                        autoComplete="username"
                      />
                    </FieldShell>

                    <button type="submit" className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
                      {t("continue")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </form>

                  <p className="mt-2 text-center text-[14px] text-[#6B8CAE]">
                    {t("no_account")}{" "}
                    <Link href="/register" className="text-[#3390EC] transition-colors hover:text-[#5EAEF0]">{t("register")}</Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div key="password" variants={slideVariants} initial="enter" animate="center" exit="exit">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 rounded-xl border border-[#1E2D3D] bg-[#101B29] p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#152232] text-[#9BBFE8]">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] uppercase tracking-wider text-[#4A6480]">{t("email_or_username")}</p>
                        <p className="truncate text-[15px] font-medium text-[#E8EDF2]">{identity}</p>
                      </div>
                    </div>

                    <div className="relative">
                      <FieldShell icon={<Lock className="h-4 w-4" />}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => { setPassword(event.target.value); setError(""); }}
                          placeholder={t("password")}
                          className={`${inputClass} pl-11 pr-12`}
                          autoComplete="current-password"
                        />
                      </FieldShell>
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#4A6480] transition-colors hover:text-[#E8EDF2]" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="text-[13px] text-[#3390EC] transition-colors hover:text-[#5EAEF0]">{t("forgot_password")}</Link>
                    </div>

                    <button type="submit" disabled={loading} className="mt-4 flex h-[48px] w-full items-center justify-center rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-50">
                      {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("sign_in")}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pb-2 pt-8 text-center text-[12px] text-[#4A6480]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tepla secure session
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
