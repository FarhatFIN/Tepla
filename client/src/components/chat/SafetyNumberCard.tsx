"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { safetyNumberWith, hasSession } from "@/lib/security/e2eeSession";
import { getSecret, putSecret } from "@/lib/security/keyStore";

interface SafetyNumberCardProps {
  peerUserId: string;
  peerName: string;
}

/**
 * Shows the 60-digit safety number for a secret chat and lets the user mark
 * the peer as verified after comparing digits out-of-band (in person / call).
 * Renders nothing when no E2EE session exists with the peer.
 */
export default function SafetyNumberCard({ peerUserId, peerName }: SafetyNumberCardProps) {
  const user = useAuthStore((s) => s.user);
  const [number, setNumber] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) return;
        if (!(await hasSession(peerUserId))) return;
        const n = await safetyNumberWith(peerUserId, user.id);
        const v = await getSecret<boolean>(`verified:${peerUserId}`);
        if (!cancelled) {
          setNumber(n);
          setVerified(Boolean(v));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to compute safety number");
      }
    })();
    return () => { cancelled = true; };
  }, [peerUserId, user?.id]);

  const toggleVerified = async () => {
    const next = !verified;
    setVerified(next);
    try {
      await putSecret(`verified:${peerUserId}`, next);
    } catch {
      setVerified(!next); // revert on storage failure
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl bg-[var(--bg-card)] p-4 text-xs text-red-400">{error}</div>
    );
  }
  if (!number) return null;

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-sm font-semibold">Safety number</span>
        </div>
        {verified && (
          <span className="flex items-center gap-1 rounded-full bg-[#00D46A]/15 px-2 py-0.5 text-[10px] font-medium text-[#00D46A]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            Verified
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 rounded-xl bg-[var(--bg-input)] p-3 font-mono text-center text-sm tracking-wider text-[var(--text-primary)]">
        {number.split(" ").map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        Сверьте эти цифры с {peerName} лично или по голосовому звонку. Если они совпадают,
        соединение защищено сквозным шифрованием и никто не подменил ключи.
      </p>

      <button
        onClick={toggleVerified}
        className={`mt-3 w-full rounded-xl py-2 text-xs font-medium transition-colors ${
          verified
            ? "bg-[var(--bg-input)] text-[var(--text-tertiary)]"
            : "bg-[var(--accent)] text-white"
        }`}
      >
        {verified ? "Снять отметку верификации" : "Отметить как верифицированный"}
      </button>
    </div>
  );
}
