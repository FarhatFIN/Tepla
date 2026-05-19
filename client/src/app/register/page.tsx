"use client";
import { FormEvent, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import OtpInput from "@/components/ui/OtpInput";
import { languages } from "@/lib/countries";
import { useTranslation } from "@/hooks/useTranslation";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const inputClass =
  "w-full h-[54px] bg-transparent border-b border-[#1E2D3D] text-[#E8EDF2] placeholder:text-[#4A6480] px-0 text-[16px] outline-none transition-all focus:border-[#3390EC]";

function getPasswordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthColors = ["#EF4444", "#F59E0B", "#EAB308", "#00D46A"];
const strengthLabels = ["password_strength_weak", "password_strength_fair", "password_strength_good", "password_strength_strong"];
type BinaryShieldIssue = {
  seedPhrase?: string;
  recoveryPatterns: Array<{ id: string; pattern: string; usesLeft: number }>;
  nextManualRotationAt: string;
};

export default function RegisterPage() {
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

  const { register, verifyOtp, resendCode, language, setLanguage: setStoreLanguage } = useAuthStore();
  const router = useRouter();
  const t = useTranslation();

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
    fetch(`/api/v2/users/check-username?username=${encodeURIComponent(clean)}`)
      .then((res) => res.json())
      .then((res) => setUsernameStatus(res.data?.available ? "available" : "taken"))
      .catch(() => setUsernameStatus("idle"));
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
      const result = await register(name, email, password, language, username, {
        birthDate,
        bio: description,
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

  const pwStrength = getPasswordStrength(password);

  if (binaryShield) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#0E1621]">
        <div className="w-full max-w-[420px] px-4 py-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
            <div className="mb-8 flex flex-col items-center">
              <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#152232]">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="1.4"><path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z"/><path d="M9 12l2 2 4-5"/></svg>
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">Tepla Binary Shield</h1>
              <p className="mt-2 text-center text-[14px] leading-relaxed text-[#6B8CAE]">Save these one-time A/B recovery patterns now. They rotate after login.</p>
            </div>

            {binaryShield.seedPhrase && (
              <div className="mb-5 rounded-lg border border-[#1E2D3D] bg-[#101B29] p-4">
                <p className="mb-2 text-[12px] uppercase text-[#4A6480]">Master seed</p>
                <p className="break-all font-mono text-[13px] leading-relaxed text-[#E8EDF2]">{binaryShield.seedPhrase}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {binaryShield.recoveryPatterns.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#1E2D3D] bg-[#101B29] p-3">
                  <p className="font-mono text-[15px] tracking-[0.12em] text-[#E8EDF2]">{item.pattern}</p>
                  <p className="mt-1 text-[11px] text-[#4A6480]">uses: {item.usesLeft}</p>
                </div>
              ))}
            </div>

            <button onClick={() => router.push("/")} className="mt-8 h-[48px] w-full rounded-lg bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98]">
              Continue to Tepla
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // OTP verification
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
      <div className="w-full max-w-[360px] px-4 py-10">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full">
          {/* Logo */}
          <div className="mb-10 flex flex-col items-center">
            <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[#152232]">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#3390EC"/>
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[#E8EDF2]">{t("register")}</h1>
            <p className="mt-2 text-center text-[14px] text-[#6B8CAE]">{t("create_tepla_account") || "Create your Tepla account"}</p>
          </div>

          {globalError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center text-[14px] text-[#EF4444]">{globalError}</motion.p>}

          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Name */}
            <div>
              <input type="text" placeholder={t("your_name")} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              {errors.name && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.name}</p>}
            </div>

            {/* Username */}
            <div className="relative mt-2">
              <input type="text" placeholder={t("your_username")} value={username} onChange={(e) => validateUsername(e.target.value)} maxLength={32} className={inputClass} />
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3390EC] border-t-transparent" />}
                {usernameStatus === "available" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                {usernameStatus === "taken" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>}
              </div>
              {usernameStatus === "available" && <p className="mt-1 text-[12px] text-[#00D46A]">{t("username_available")}</p>}
              {usernameStatus === "taken" && <p className="mt-1 text-[12px] text-[#EF4444]">{t("username_taken")}</p>}
              {errors.username && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.username}</p>}
            </div>

            {/* Email */}
            <div className="mt-2">
              <input type="email" placeholder={t("your_email")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />
              {errors.email && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.email}</p>}
            </div>

            <div className="mt-2">
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
            </div>

            <div className="mt-2">
              <input type="url" placeholder="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={inputClass} />
            </div>

            <div className="mt-2">
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 240))} className={`${inputClass} min-h-[76px] resize-none py-4`} />
            </div>

            {/* Language */}
            <div className="mt-6">
              <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#4A6480]">{t("auto_translate_lang")}</p>
              <div className="flex flex-wrap gap-2">
                {languages.slice(0, 9).map((lang) => (
                  <button key={lang.code} type="button" onClick={() => setStoreLanguage(lang.code)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-all ${language === lang.code ? "bg-[#3390EC] text-white" : "bg-[#152232] text-[#6B8CAE] hover:bg-[#1A2B3D]"}`}>
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="relative mt-6">
              <input type={showPassword ? "text" : "password"} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#4A6480] hover:text-[#6B8CAE] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              {errors.password && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.password}</p>}
              {password.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-[3px] flex-1 rounded-full transition-colors" style={{ background: i < pwStrength ? strengthColors[pwStrength - 1] : "#152232" }} />
                    ))}
                  </div>
                  <span className="text-[11px] min-w-[40px]" style={{ color: strengthColors[pwStrength - 1] || "#4A6480" }}>
                    {pwStrength > 0 ? t(strengthLabels[pwStrength - 1]) : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="relative mt-2">
              <input type="password" placeholder={t("repeat_password")} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" />
              {confirm.length > 0 && confirm === password && (
                <svg className="absolute right-0 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              {errors.confirm && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.confirm}</p>}
            </div>

            {/* Terms */}
            <label className="mt-6 flex items-start gap-3 cursor-pointer">
              <button type="button" onClick={() => setAgreedTerms(!agreedTerms)} className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors ${agreedTerms ? "bg-[#3390EC]" : "border border-[#1E2D3D]"}`}>
                {agreedTerms && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <span className="text-[13px] leading-relaxed text-[#6B8CAE]">{t("agree_terms")}</span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreedTerms}
              className="mt-8 h-[48px] w-full rounded-lg bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-40"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : t("create_account")}
            </button>

            <p className="mt-6 mb-8 text-center text-[14px] text-[#6B8CAE]">
              {t("already_have_account")}{" "}
              <Link href="/login" className="text-[#3390EC] hover:text-[#5EAEF0] transition-colors">{t("sign_in")}</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
