"use client";
import { useTranslation } from "@/hooks/useTranslation";

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

export default function TransactionList({ transactions, currentUserId }: { transactions: Transaction[]; currentUserId: string }) {
  const t = useTranslation();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" opacity="0.4">
          <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
        </svg>
        <p className="mt-3 text-sm text-[var(--text-tertiary)]">{t("no_transactions")}</p>
      </div>
    );
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase mb-2">{date}</p>
          <div className="space-y-1">
            {txs.map(tx => {
              const isIncoming = tx.toUserId === currentUserId;
              return (
                <div key={tx.id} className="flex items-center gap-3 rounded-lg bg-[var(--bg-card)] px-3 py-2.5">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isIncoming ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {isIncoming ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{tx.description || formatType(tx.type)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {tx.status !== "completed" && ` · ${tx.status}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${isIncoming ? "text-emerald-400" : "text-[var(--text-primary)]"}`}>
                      {isIncoming ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                    </p>
                    {parseFloat(tx.fee) > 0 && (
                      <p className="text-[10px] text-[var(--text-tertiary)]">fee: ${parseFloat(tx.fee).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function groupByDate(txs: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const date = new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  }
  return groups;
}
