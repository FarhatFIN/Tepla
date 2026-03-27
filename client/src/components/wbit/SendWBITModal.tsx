"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  balance: number;
}

export default function SendWBITModal({ onClose, onSuccess, balance }: Props) {
  const t = useTranslation();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  const parsedAmount = parseFloat(amount) || 0;
  const fee = parsedAmount * 0.01; // 1% fee
  const total = parsedAmount + fee;
  const gasEstimate = 0.05; // ~0.05 TON gas

  async function handleSend() {
    if (!recipient.trim()) { setError(t("recipient") + " required"); return; }
    if (parsedAmount <= 0) { setError(t("amount") + " required"); return; }
    if (total > balance) { setError(t("insufficient_balance")); return; }

    setSending(true);
    setError("");

    try {
      const res = await api.post<{ data: { txHash: string } }>("/wbit/transfer", {
        toAddress: recipient.startsWith("EQ") || recipient.startsWith("UQ") ? recipient : undefined,
        toUserId: !recipient.startsWith("EQ") && !recipient.startsWith("UQ") ? recipient : undefined,
        amount: amount,
        description: description || undefined,
      });

      setTxHash(res.data.txHash);
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (err: any) {
      setError(err.message || t("transfer_failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">WBIT</span>
          <span className="text-sm">{t("wbit_send")}</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm font-medium text-emerald-400">{t("transfer_success")}</p>
            {txHash && <p className="text-[10px] text-[var(--text-tertiary)] truncate max-w-full">TX: {txHash}</p>}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("recipient")}</label>
              <input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="@username, user ID, or TON address"
                className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("amount")} (WBIT)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.1"
                  className="w-full rounded-lg bg-[var(--bg-input)] py-2.5 px-3 pr-16 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={() => setAmount(String(Math.floor(balance * 0.99)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20"
                >
                  MAX
                </button>
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{t("balance")}: {balance.toLocaleString()} WBIT</p>
            </div>

            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("description")}</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {parsedAmount > 0 && (
              <div className="mb-4 rounded-lg bg-[var(--bg-input)] p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--text-tertiary)]">{t("amount")}</span>
                  <span>{parsedAmount} WBIT</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--text-tertiary)]">{t("fee")} (1%)</span>
                  <span>{fee.toFixed(2)} WBIT</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--text-tertiary)]">Gas</span>
                  <span>~{gasEstimate} TON</span>
                </div>
                <div className="flex justify-between font-medium border-t border-[var(--border)] pt-1 mt-1">
                  <span>{t("total")}</span>
                  <span>{total.toFixed(2)} WBIT</span>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg bg-[var(--bg-input)] py-2.5 text-sm font-medium hover:bg-[var(--bg-hover)]">
                {t("cancel")}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || parsedAmount <= 0}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "..." : t("confirm_transfer")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
