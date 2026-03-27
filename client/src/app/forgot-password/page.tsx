"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const inputClass =
  "w-full h-[54px] bg-transparent border-b border-[#1E2D3D] text-[#E8EDF2] placeholder:text-[#4A6480] px-0 text-[16px] outline-none transition-all focus:border-[#3390EC]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) { setError(t("enter_valid_email")); return; }
    setLoading(true);
    setError("");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v2/auth/pin/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Failed to send reset link");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#0E1621] px-4 py-8">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="success" initial="hidden" animate="visible" variants={fadeUp} className="w-full max-w-[360px]">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#0D1F15]"
              >
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>
              </motion.div>

              <h1 className="mt-6 text-2xl font-semibold text-[#E8EDF2]">{t("check_your_email")}</h1>
              <p className="mt-3 text-center text-[14px] leading-relaxed text-[#6B8CAE]">{t("reset_link_sent", { email })}</p>

              <Link href="/login" className="mt-8 text-[14px] text-[#3390EC] hover:text-[#5EAEF0] transition-colors">{t("back_to_login")}</Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial="hidden" animate="visible" variants={fadeUp} className="w-full max-w-[360px]">
            <Link href="/login" className="mb-8 inline-flex text-[#4A6480] hover:text-[#E8EDF2] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </Link>

            <div className="mb-10 flex flex-col items-center">
              <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#152232]">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#3390EC" strokeWidth="1.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h1 className="mt-6 text-2xl font-semibold text-[#E8EDF2]">{t("reset_password")}</h1>
              <p className="mt-3 text-center text-[14px] leading-relaxed text-[#6B8CAE]">{t("enter_registered_email")}</p>
            </div>

            {error && <p className="mb-6 text-center text-[14px] text-[#EF4444]">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col">
              <input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" />

              <button type="submit" disabled={loading} className="mt-8 h-[48px] w-full rounded-lg bg-[#3390EC] text-[15px] font-medium text-white transition-all hover:bg-[#4AA3F5] active:scale-[0.98] disabled:opacity-50">
                {loading ? <div className="flex items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /></div> : t("send_reset_link")}
              </button>

              <Link href="/login" className="mt-6 block text-center text-[14px] text-[#4A6480] hover:text-[#6B8CAE] transition-colors">{t("back_to_login")}</Link>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
