"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Deep link landing page for chat/poll invite links: /invite/<code>.
 * Joins the chat behind the invite code and opens it in the main app.
 */
export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [error, setError] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    const code = params?.code;
    if (!code) return;
    hydrate();
    let authed = false;
    try { authed = Boolean(localStorage.getItem("tepla-auth")); } catch { /* ignore */ }
    if (!authed) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const res = await api.post<{ success: boolean; data: { chatId: string } }>(`/invites/${code}/join`);
        try { sessionStorage.setItem("tepla-open-chat", res.data.chatId); } catch { /* ignore */ }
        router.replace("/");
      } catch {
        setError(true);
      }
    })();
  }, [params?.code, hydrate, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
      {error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-2xl">🔗</span>
          <p className="text-sm text-[var(--text-secondary)]">{t("invite_invalid")}</p>
          <button onClick={() => router.replace("/")} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
            Tepla
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--text-tertiary)]">{t("joining_chat")}</p>
        </div>
      )}
    </main>
  );
}
