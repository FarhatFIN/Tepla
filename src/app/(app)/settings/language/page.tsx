"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";
import { useAuthStore } from "@/stores/auth.store";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LanguageSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [language, setLanguage] = useState(user?.language ?? DEFAULT_LANGUAGE);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) {
      setMessage("Sign in to change language.");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to save language.");
      }
      updateUser({ language });
      setMessage("Language updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSubpageShell title="Language">
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label htmlFor="language" className="text-xs text-tepla-text-muted">
              Interface language
            </label>
            <Select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          {message ? <p className="text-xs text-tepla-text-muted">{message}</p> : null}
          <Button className="w-full" disabled={isSaving || !user} onClick={() => void handleSave()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save language"}
          </Button>
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
