"use client";
import { useAuthStore } from "@/stores/auth-store";
import { t } from "@/lib/i18n";

export function useTranslation() {
  const language = useAuthStore((s) => s.language);
  return (key: string, params?: Record<string, string | number>) => t(key, language, params);
}
