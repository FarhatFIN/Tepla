"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AtSign,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import OtpInput from "@/components/ui/OtpInput";
import { languages } from "@/lib/countries";
import { useTranslation } from "@/hooks/useTranslation";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const slideVariants = {
  enter: { opacity: 0, x: 28 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

const inputClass =
  "h-[52px] w-full rounded-xl border border-[#1E2D3D] bg-[#101B29] px-4 text-[15px] text-[#E8EDF2] outline-none transition-all placeholder:text-[#4A6480] focus:border-[#3390EC] focus:ring-2 focus:ring-[#3390EC]/20";

const textareaClass =
  "min-h-[92px] w-full resize-none rounded-xl border border-[#1E2D3D] bg-[#101B29] px-4 py-3 text-[15px] text-[#E8EDF2] outline-none transition-all placeholder:text-[#4A6480] focus:border-[#3390EC] focus:ring-2 focus:ring-[#3390EC]/20";

type RegisterStep = 0 | 1 | 2;

type BinaryShieldIssue = {
  seedPhrase?: string;
  recoveryPatterns: Array<{ id: string; pattern: string; usesLeft: number }>;
  nextManualRotationAt: string;
};

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthColors = ["#EF4444", "#F59E0B", "#EAB308", "#00D46A"];
const strengthLabels = [
  "password_strength_weak",
  "password_strength_fair",
  "password_strength_good",
  "password_strength_strong",
];

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex ${compact ? "h-16 w-16" : "h-24 w-24"} items-center justify-center rounded-full bg-[#152232] shadow-[0_20px_60px_rgba(51,144,236,0.12)]`}>
      <Sparkles className={compact ? "h-7 w-7 text-[#3390EC]" : "h-10 w-10 text-[#3390EC]"} strokeWidth={1.7} />
    </div>
  );
}

function StepDots({ step }: { step: RegisterStep }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((item) => (
        <span
          key={item}
          className={`h-1.5 rounded-full transition-all ${step === item ? "w-8 bg-[#3390EC]" : "w-2 bg-[#1E2D3D]"}`}
        />
      ))}
    </div>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[12px] text-[#EF4444]">{children}</p>;
}

function InputWrap({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#4A6480]">{icon}</div>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<RegisterStep>(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [binaryShield, setBinaryShield] = useState<BinaryShieldIssue | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const usernameRequestRef = useRef(0);

  const { register, verifyOtp, resendCode, language, setLanguage: setStoreLanguage } = useAuthStore();
  const router = useRouter();
  const t = useTranslation();
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function validateUsername(value: string) {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(clean);
    setErrors((current) => ({ ...current, username: "" }));

    if (clean.length < 4) {
      setUsernameStatus("idle");
      return;
    }

    const requestId = usernameRequestRef.current + 1;
    usernameRequestRef.current = requestId;
    setUsernameStatus("checking");

    fetch(`/api/v2/users/check-username?username=${encodeURIComponent(clean)}`)
      .then((response) => response.json())
      .then((response) => {
        if (usernameRequestRef.current !== requestId) return;
        setUsernameStatus(response.data?.available ? "available" : "taken");
      })
      .catch(() => {
        if (usernameRequestRef.current === requestId) setUsernameStatus("idle");
      });
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, avatar: "Choose an image file" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, avatar: "Image must be under 5 MB" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(typeof reader.result === "string" ? reader.result : "");
      setErrors((current) => ({ ...current, avatar: "" }));
    };
    reader.readAsDataURL(file);
  }

  function validateStep(target: RegisterStep) {
    const nextErrors: Record<string, string> = {};

    if (target === 0) {
      if (!name.trim() || name.trim().length < 2) nextErrors.name = t("min_2_chars");
      if (!username || username.length < 4) nextErrors.username = t("min_4_chars");
      if (username && !/^[a-z0-9_]+$/.test(username)) nextErrors.username = t("only_az_09");
      if (usernameStatus === "checking") nextErrors.username = t("username_checking");
      if (usernameStatus === "taken") nextErrors.username = t("username_taken");
    }

    if (target === 1) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = t("enter_valid_email");
    }

    if (target === 2) {
      if (!password || password.length < 6) nextErrors.password = t("password_min_6");
      if (confirm !== password) nextErrors.confirm = t("passwords_dont_match");
      if (!agreedTerms) nextErrors.terms = t("agree_terms");
    }

    return nextErrors;
  }

  function validateAll() {
    return {
      ...validateStep(0),
      ...validateStep(1),
      ...validateStep(2),
    };
  }

  function goNext() {
    const currentErrors = validateStep(step);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length) return;
    setStep((current) => (current < 2 ? ((current + 1) as RegisterStep) : current));
  }

  function goBack() {
    setGlobalError("");
    setErrors({});
    setStep((current) => (current > 0 ? ((current - 1) as RegisterStep) : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGlobalError("");
    const currentErrors = validateAll();
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length) {
      if (currentErrors.name || currentErrors.username) setStep(0);
      else if (currentErrors.email) setStep(1);
      else setStep(2);
      return;
    }

    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), password, language, username, {
        birthDate,
        bio: description.trim(),
        avatarUrl,
      });

      if (result.ok) {
        if (result.binaryShield) {
          setBinaryShield(result.binaryShield);
          setLoading(false);
          return;
        }
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
    try {
      await resendCode(otpEmail);
      setResendMessage(t("new_code_sent"));
      setResendCooldown(60);
    } catch {
      setOtpError(t("too_many_attempts"));
    }
  }

  if (binaryShield) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0B111A]">
        <div className="w-full max-w-[440px] px-4 py-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <div className="mb-8 flex flex-col items-center text-center">
              <LogoMark compact />
              <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">Tepla Binary Shield</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B8CAE]">Save these one-time A/B recovery patterns now. They rotate after login.</p>
            </div>

            {binaryShield.seedPhrase && (
              <div className="mb-5 rounded-xl border border-[#1E2D3D] bg-[#101B29] p-4">
                <p className="mb-2 text-[12px] uppercase text-[#4A6480]">Master seed</p>
                <p className="break-all font-mono text-[13px] leading-relaxed text-[#E8EDF2]">{binaryShield.seedPhrase}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {binaryShield.recoveryPatterns.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#1E2D3D] bg-[#101B29] p-3">
                  <p className="font-mono text-[15px] tracking-[0.12em] text-[#E8EDF2]">{item.pattern}</p>
                  <p className="mt-1 text-[11px] text-[#4A6480]">uses: {item.usesLeft}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.push("/")} className="mt-8 h-[48px] w-full rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
              Continue to Tepla
            </button>
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

  const stepTitles = [
    { title: t("register_title"), subtitle: "Create your public Tepla profile." },
    { title: "Contact", subtitle: "Add the email used for verification." },
    { title: "Security", subtitle: "Choose a password and confirm the basics." },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B111A]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-4 py-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex min-h-full flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Link href="/login" className="rounded-full p-2 text-[#4A6480] transition-colors hover:bg-[#152232] hover:text-[#E8EDF2]" aria-label={t("back")}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <StepDots step={step} />
            <span className="w-9 text-right text-[12px] font-medium text-[#4A6480]">{step + 1}/3</span>
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <LogoMark compact />
            <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">{stepTitles[step].title}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B8CAE]">{stepTitles[step].subtitle}</p>
          </div>

          {globalError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center text-[14px] text-[#EF4444]">{globalError}</motion.p>}

          <form onSubmit={handleSubmit} className="mt-8 flex flex-1 flex-col">
            <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" className="flex flex-col gap-4">
              {step === 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="group relative flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border border-[#1E2D3D] bg-[#101B29] text-[#6B8CAE] transition-all hover:border-[#3390EC] hover:text-[#E8EDF2]"
                    >
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" unoptimized />
                      ) : (
                        <ImagePlus className="h-9 w-9" strokeWidth={1.6} />
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-black/45 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {t("add_photo")}
                      </span>
                    </button>
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#152232] px-4 py-2 text-[13px] font-medium text-[#9BBFE8] transition-colors hover:bg-[#1B2A3E]">
                      <Camera className="h-4 w-4" />
                      Choose from media library
                    </button>
                    <FieldError>{errors.avatar}</FieldError>
                  </div>

                  <div>
                    <InputWrap icon={<User className="h-4 w-4" />}>
                      <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("your_name")} className={`${inputClass} pl-11`} autoComplete="name" />
                    </InputWrap>
                    <FieldError>{errors.name}</FieldError>
                  </div>

                  <div>
                    <InputWrap icon={<AtSign className="h-4 w-4" />}>
                      <input value={username} onChange={(event) => validateUsername(event.target.value)} placeholder={t("your_username")} className={`${inputClass} pl-11 pr-11`} maxLength={32} autoComplete="username" />
                    </InputWrap>
                    <div className="absolute" />
                    <div className="mt-1.5 flex min-h-4 items-center gap-1.5 text-[12px]">
                      {usernameStatus === "checking" && <span className="text-[#6B8CAE]">{t("username_checking")}</span>}
                      {usernameStatus === "available" && <span className="inline-flex items-center gap-1 text-[#00D46A]"><Check className="h-3 w-3" />{t("username_available_label")}</span>}
                      {usernameStatus === "taken" && <span className="inline-flex items-center gap-1 text-[#EF4444]"><X className="h-3 w-3" />{t("username_taken_label")}</span>}
                    </div>
                    <FieldError>{errors.username}</FieldError>
                  </div>

                  <div>
                    <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 240))} placeholder="Profile bio" className={textareaClass} />
                    <p className="mt-1 text-right text-[11px] text-[#4A6480]">{description.length}/240</p>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <InputWrap icon={<Mail className="h-4 w-4" />}>
                      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("your_email")} className={`${inputClass} pl-11`} autoComplete="email" />
                    </InputWrap>
                    <FieldError>{errors.email}</FieldError>
                  </div>

                  <div>
                    <InputWrap icon={<Calendar className="h-4 w-4" />}>
                      <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className={`${inputClass} pl-11`} />
                    </InputWrap>
                  </div>

                  <div>
                    <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#4A6480]">{t("auto_translate_lang")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {languages.slice(0, 9).map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setStoreLanguage(lang.code)}
                          className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border px-2 text-[12px] transition-all ${
                            language === lang.code
                              ? "border-[#3390EC] bg-[#3390EC]/15 text-[#E8EDF2]"
                              : "border-[#1E2D3D] bg-[#101B29] text-[#6B8CAE] hover:border-[#2B4966]"
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span className="truncate">{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <div className="relative">
                      <InputWrap icon={<Lock className="h-4 w-4" />}>
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("password")} className={`${inputClass} pl-11 pr-12`} autoComplete="new-password" />
                      </InputWrap>
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#4A6480] transition-colors hover:text-[#E8EDF2]">
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    </div>
                    <FieldError>{errors.password}</FieldError>
                    {password.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[0, 1, 2, 3].map((item) => (
                            <div key={item} className="h-[3px] flex-1 rounded-full transition-colors" style={{ background: item < passwordStrength ? strengthColors[passwordStrength - 1] : "#152232" }} />
                          ))}
                        </div>
                        <span className="min-w-[54px] text-right text-[11px]" style={{ color: strengthColors[passwordStrength - 1] || "#4A6480" }}>
                          {passwordStrength > 0 ? t(strengthLabels[passwordStrength - 1]) : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="relative">
                      <InputWrap icon={<Lock className="h-4 w-4" />}>
                        <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={t("repeat_password")} className={`${inputClass} pl-11 pr-11`} autoComplete="new-password" />
                      </InputWrap>
                      {confirm.length > 0 && confirm === password && <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00D46A]" />}
                    </div>
                    <FieldError>{errors.confirm}</FieldError>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#1E2D3D] bg-[#101B29] p-3">
                    <button
                      type="button"
                      onClick={() => setAgreedTerms((checked) => !checked)}
                      className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md transition-colors ${agreedTerms ? "bg-[#3390EC]" : "border border-[#2C4058]"}`}
                    >
                      {agreedTerms && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                    <span className="text-[13px] leading-relaxed text-[#6B8CAE]">{t("agree_terms")}</span>
                  </label>
                  <FieldError>{errors.terms}</FieldError>
                </>
              )}
            </motion.div>

            <div className="mt-auto pt-8">
              <div className="flex gap-3">
                {step > 0 && (
                  <button type="button" onClick={goBack} className="flex h-[48px] w-14 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#101B29] text-[#9BBFE8] transition-colors hover:bg-[#152232]">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {step < 2 ? (
                  <button type="button" onClick={goNext} className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="flex h-[48px] flex-1 items-center justify-center rounded-xl bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-50">
                    {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t("create_account")}
                  </button>
                )}
              </div>

              <p className="mt-6 text-center text-[14px] text-[#6B8CAE]">
                {t("already_have_account")}{" "}
                <Link href="/login" className="text-[#3390EC] transition-colors hover:text-[#5EAEF0]">{t("sign_in")}</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
