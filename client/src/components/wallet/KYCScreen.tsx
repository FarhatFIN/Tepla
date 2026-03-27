"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  wallet: { kycStatus: string } | null;
  onBack: () => void;
}

export default function KYCScreen({ wallet, onBack }: Props) {
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(wallet?.kycStatus || "none");
  const [error, setError] = useState("");

  async function startKYC() {
    setLoading(true);
    setError("");
    try {
      await api.post("/wallet/kyc/start");
      setStatus("pending");

      // Get SDK token for Sumsub widget
      const tokenRes = await api.post<{ data: { token: string } }>("/wallet/kyc/token");
      const token = tokenRes.data.token;

      // Launch Sumsub WebSDK if available
      if (typeof window !== "undefined" && (window as any).SumsubWebSdk) {
        (window as any).SumsubWebSdk.init(token, () => {}, {
          lang: "en",
          theme: "dark",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h2 className="text-lg font-semibold">{t("kyc_verification")}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Status Card */}
        <div className="rounded-2xl bg-[var(--bg-card)] p-6 text-center">
          {status === "approved" ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-emerald-400">{t("kyc_approved")}</h3>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Your identity has been verified. You now have access to higher limits and withdrawal features.
              </p>
            </>
          ) : status === "pending" ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-amber-400">{t("kyc_pending")}</h3>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Your documents are being reviewed. This usually takes a few minutes.
              </p>
            </>
          ) : status === "rejected" ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-red-400">{t("kyc_rejected")}</h3>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                Your verification was rejected. Please try again with valid documents.
              </p>
              <button
                onClick={startKYC}
                disabled={loading}
                className="mt-4 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "..." : t("start_verification")}
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
              </div>
              <h3 className="text-lg font-semibold">{t("kyc_required")}</h3>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">{t("kyc_required_desc")}</p>

              {/* Benefits */}
              <div className="mt-6 space-y-3 text-left">
                {[
                  { icon: "shield", text: "Transfers over $100" },
                  { icon: "dollar", text: "Higher daily & monthly limits" },
                  { icon: "bank", text: "Withdrawal to bank account" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 rounded-lg bg-[var(--bg-input)] px-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startKYC}
                disabled={loading}
                className="mt-6 w-full rounded-lg bg-[var(--accent)] py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "..." : t("start_verification")}
              </button>
            </>
          )}

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>

        {/* Sumsub WebSDK container */}
        <div id="sumsub-websdk-container" className="mt-4" />
      </div>
    </div>
  );
}
