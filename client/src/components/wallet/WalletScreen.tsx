"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import TransactionList from "./TransactionList";
import SendMoneyModal from "./SendMoneyModal";
import KYCScreen from "./KYCScreen";

interface WalletProfile {
  id: string;
  userId: string;
  currency: string;
  balance: string;
  frozenBalance: string;
  kycStatus: "none" | "pending" | "approved" | "rejected";
  dailyLimit: string;
  monthlyLimit: string;
  isBlocked: boolean;
}

interface Transaction {
  id: string;
  fromUserId: string | null;
  toUserId: string | null;
  type: string;
  amount: string;
  currency: string;
  fee: string;
  status: string;
  description: string | null;
  createdAt: string;
}

export default function WalletScreen({ onBack }: { onBack: () => void }) {
  const t = useTranslation();
  const [wallet, setWallet] = useState<WalletProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");

  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, []);

  async function loadWallet() {
    try {
      const res = await api.get<{ data: WalletProfile }>("/wallet/profile");
      setWallet(res.data);
    } catch (err) {
      console.error("Failed to load wallet:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      const res = await api.get<{ data: Transaction[] }>("/wallet/transactions?limit=50");
      setTransactions(res.data);
    } catch {}
  }

  async function handleDeposit() {
    const amountStr = prompt(t("amount"));
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await api.post("/wallet/deposit", { amount });
      loadWallet();
      loadTransactions();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (showKYC) {
    return <KYCScreen wallet={wallet} onBack={() => { setShowKYC(false); loadWallet(); }} />;
  }

  const balance = parseFloat(wallet?.balance || "0");
  const frozen = parseFloat(wallet?.frozenBalance || "0");

  return (
    <div className="flex h-full flex-col bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h2 className="text-lg font-semibold">{t("wallet")}</h2>
      </div>

      {/* Balance Card */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-600 p-6 text-white">
        <p className="text-sm opacity-80">{t("balance")}</p>
        <p className="mt-1 text-3xl font-bold">${balance.toFixed(2)}</p>
        {frozen > 0 && (
          <p className="mt-1 text-xs opacity-60">{t("frozen")}: ${frozen.toFixed(2)}</p>
        )}

        {/* KYC Badge */}
        <div className="mt-3 flex items-center gap-2">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            wallet?.kycStatus === "approved" ? "bg-emerald-500/20 text-emerald-200" :
            wallet?.kycStatus === "pending" ? "bg-amber-500/20 text-amber-200" :
            wallet?.kycStatus === "rejected" ? "bg-red-500/20 text-red-200" :
            "bg-white/10 text-white/70"
          }`}>
            {wallet?.kycStatus === "approved" ? t("kyc_approved") :
             wallet?.kycStatus === "pending" ? t("kyc_pending") :
             wallet?.kycStatus === "rejected" ? t("kyc_rejected") :
             t("kyc_not_started")}
          </div>
          {wallet?.kycStatus !== "approved" && wallet?.kycStatus !== "pending" && (
            <button onClick={() => setShowKYC(true)} className="text-xs underline opacity-70 hover:opacity-100">
              {t("start_verification")}
            </button>
          )}
        </div>

        {wallet?.isBlocked && (
          <div className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">
            {t("wallet_blocked")}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => setShowSendModal(true)}
          disabled={wallet?.isBlocked}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-[var(--bg-card)] p-3 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
          </div>
          <span className="text-xs">{t("send_money")}</span>
        </button>
        <button
          onClick={handleDeposit}
          disabled={wallet?.isBlocked}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-[var(--bg-card)] p-3 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
          </div>
          <span className="text-xs">{t("deposit")}</span>
        </button>
        <button
          onClick={() => {
            if (wallet?.kycStatus !== "approved") { setShowKYC(true); return; }
            const amountStr = prompt(t("amount"));
            if (!amountStr) return;
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) return;
            api.post("/wallet/withdraw", { amount }).then(() => { loadWallet(); loadTransactions(); }).catch((e: any) => alert(e.message));
          }}
          disabled={wallet?.isBlocked}
          className="flex flex-col items-center gap-1.5 rounded-xl bg-[var(--bg-card)] p-3 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
          </div>
          <span className="text-xs">{t("withdraw")}</span>
        </button>
      </div>

      {/* Limits */}
      {wallet && (
        <div className="mx-4 mt-3 flex gap-3">
          <div className="flex-1 rounded-lg bg-[var(--bg-card)] px-3 py-2">
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("daily_limit")}</p>
            <p className="text-sm font-medium">${parseFloat(wallet.dailyLimit).toFixed(0)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-[var(--bg-card)] px-3 py-2">
            <p className="text-[10px] text-[var(--text-tertiary)]">{t("monthly_limit")}</p>
            <p className="text-sm font-medium">${parseFloat(wallet.monthlyLimit).toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-1 rounded-lg bg-[var(--bg-card)] p-1">
        {(["overview", "transactions"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${activeTab === tab ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {tab === "overview" ? t("wallet") : t("transactions")}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeTab === "transactions" ? (
          <TransactionList transactions={transactions} currentUserId={wallet?.userId || ""} />
        ) : (
          <div className="space-y-3">
            {/* Quick stats */}
            <div className="rounded-xl bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-medium mb-3">{t("transaction_history")}</h3>
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm">{tx.description || tx.type}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-medium ${tx.toUserId === wallet?.userId ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.toUserId === wallet?.userId ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-sm text-[var(--text-tertiary)] py-4">{t("no_transactions")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send Money Modal */}
      {showSendModal && (
        <SendMoneyModal
          onClose={() => setShowSendModal(false)}
          onSuccess={() => { loadWallet(); loadTransactions(); }}
          balance={balance}
        />
      )}
    </div>
  );
}
