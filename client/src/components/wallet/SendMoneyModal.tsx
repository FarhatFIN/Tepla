"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  balance: number;
}

export default function SendMoneyModal({ onClose, onSuccess, balance }: Props) {
  const t = useTranslation();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const fee = parsedAmount > 50 ? parseFloat((parsedAmount * 0.01).toFixed(2)) : 0;
  const total = parsedAmount + fee;

  async function handleSend() {
    if (!recipient.trim()) { setError(t("recipient") + " required"); return; }
    if (parsedAmount <= 0) { setError(t("amount") + " required"); return; }
    if (total > balance) { setError(t("insufficient_balance")); return; }

    setSending(true);
    setError("");

    try {
      // First resolve username to userId
      const userRes = await api.get<{ data: { id: string } }>(`/users/search?q=${encodeURIComponent(recipient)}`).catch(() => null);
      const toUserId = (userRes as any)?.data?.[0]?.id || recipient;

      await api.post("/wallet/transfer", {
        toUserId,
        amount: parsedAmount,
        description: description || undefined,
        idempotencyKey: crypto.randomUUID(),
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || t("transfer_failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{t("send_money")}</h3>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm font-medium text-emerald-400">{t("transfer_success")}</p>
          </div>
        ) : (
          <>
            {/* Recipient */}
            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("recipient")}</label>
              <input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="@username or user ID"
                className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Amount */}
            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("amount")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg bg-[var(--bg-input)] py-2.5 pl-7 pr-3 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{t("balance")}: ${balance.toFixed(2)}</p>
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">{t("description")}</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Fee & Total */}
            {parsedAmount > 0 && (
              <div className="mb-4 rounded-lg bg-[var(--bg-input)] p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--text-tertiary)]">{t("amount")}</span>
                  <span>${parsedAmount.toFixed(2)}</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-tertiary)]">{t("fee")} (1%)</span>
                    <span>${fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t border-[var(--border)] pt-1 mt-1">
                  <span>{t("total")}</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            {/* Buttons */}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg bg-[var(--bg-input)] py-2.5 text-sm font-medium hover:bg-[var(--bg-hover)]">
                {t("cancel")}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || parsedAmount <= 0}
                className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
