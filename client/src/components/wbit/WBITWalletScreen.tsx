"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import SendWBITModal from "./SendWBITModal";
import WBITPriceCard from "./WBITPriceCard";

interface WBITBalance {
  wbitBalance: string;
  tonBalance: string;
  formatted: string;
  tonAddress: string;
}

interface WBITTransaction {
  id: string;
  type: string;
  amount: string;
  txHash: string;
  from: string;
  to: string;
  status: string;
  description: string | null;
  createdAt: string;
}

export default function WBITWalletScreen({ onBack }: { onBack: () => void }) {
  const t = useTranslation();
  const [balance, setBalance] = useState<WBITBalance | null>(null);
  const [transactions, setTransactions] = useState<WBITTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletExists, setWalletExists] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [tab, setTab] = useState<"overview" | "history">("overview");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await api.get<{ data: WBITBalance }>("/wbit/balance");
      setBalance(res.data);
      setWalletExists(true);
      loadTransactions();
    } catch (err: any) {
      if (err.message?.includes("not found") || err.message?.includes("404")) {
        setWalletExists(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const res = await api.get<{ data: WBITTransaction[] }>("/wbit/transactions?limit=50");
      setTransactions(res.data);
    } catch {}
  }

  async function createWallet() {
    setCreating(true);
    try {
      await api.post("/wbit/wallet/create");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">WBIT</span>
          <span className="text-sm text-[var(--text-tertiary)]">{t("wbit_token")}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!walletExists ? (
          /* Create Wallet CTA */
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">W</span>
            </div>
            <h2 className="text-xl font-bold">{t("wbit_create_wallet")}</h2>
            <p className="mt-2 text-center text-sm text-[var(--text-tertiary)]">{t("wbit_create_desc")}</p>
            <button
              onClick={createWallet}
              disabled={creating}
              className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "..." : t("wbit_create_wallet")}
            </button>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white">
              <p className="text-xs opacity-70">WBIT {t("balance")}</p>
              <p className="mt-1 text-3xl font-bold">{balance?.formatted || "0 WBIT"}</p>
              <div className="mt-2 flex items-center gap-3 text-xs opacity-60">
                <span>{balance?.tonBalance || "0"} TON</span>
                <span className="truncate max-w-[180px]">{balance?.tonAddress}</span>
              </div>
            </div>

            {/* Price Card */}
            <div className="mx-4 mt-3">
              <WBITPriceCard />
            </div>

            {/* Actions */}
            <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
              <button onClick={() => setShowSend(true)} className="flex flex-col items-center gap-1.5 rounded-xl bg-[var(--bg-card)] p-3 hover:bg-[var(--bg-hover)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                </div>
                <span className="text-[11px]">{t("wbit_send")}</span>
              </button>
              <button onClick={() => window.open("https://app.ston.fi", "_blank")} className="flex flex-col items-center gap-1.5 rounded-xl bg-[var(--bg-card)] p-3 hover:bg-[var(--bg-hover)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22V8M5 12H2l10-10 10 10h-3"/></svg>
                </div>
                <span className="text-[11px]">{t("wbit_buy")}</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="mx-4 mt-4 flex gap-1 rounded-lg bg-[var(--bg-card)] p-1">
              {(["overview", "history"] as const).map(t2 => (
                <button
                  key={t2}
                  onClick={() => setTab(t2)}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${tab === t2 ? "bg-cyan-500 text-white" : "text-[var(--text-secondary)]"}`}
                >
                  {t2 === "overview" ? t("wbit_overview") : t("wbit_history")}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              {tab === "history" ? (
                transactions.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-tertiary)] py-8">{t("no_transactions")}</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 rounded-lg bg-[var(--bg-card)] px-3 py-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          tx.type === "transfer" && tx.to === balance?.tonAddress ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                        }`}>
                          <span className="text-xs font-bold">W</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{tx.description || tx.type}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm font-medium ${
                          tx.to === balance?.tonAddress ? "text-emerald-400" : ""
                        }`}>
                          {tx.to === balance?.tonAddress ? "+" : "-"}{tx.amount} WBIT
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {/* Token economics */}
                  <div className="rounded-xl bg-[var(--bg-card)] p-4">
                    <h3 className="text-sm font-medium mb-2">{t("wbit_rewards")}</h3>
                    <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex justify-between"><span>{t("wbit_daily_active")}</span><span className="text-cyan-400">+1 WBIT/{t("wbit_day")}</span></div>
                      <div className="flex justify-between"><span>{t("wbit_referral")}</span><span className="text-cyan-400">+10 WBIT</span></div>
                      <div className="flex justify-between"><span>{t("wbit_messages_bonus")}</span><span className="text-cyan-400">+2 WBIT</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showSend && balance && (
        <SendWBITModal
          onClose={() => setShowSend(false)}
          onSuccess={() => { loadData(); loadTransactions(); }}
          balance={parseFloat(balance.wbitBalance)}
        />
      )}
    </div>
  );
}
