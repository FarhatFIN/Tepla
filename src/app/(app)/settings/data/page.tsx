"use client";

import { useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const estimateStorage = () => {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? "";
    total += key.length + value.length;
  }
  return total * 2;
};

export default function DataSettingsPage() {
  const [storageUsed, setStorageUsed] = useState(0);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setStorageUsed(estimateStorage());
  }, [cleared]);

  const handleClearCache = () => {
    const preserveKeys = ["tepla.ui", "tepla-auth"];
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && !preserveKeys.some((k) => key.startsWith(k))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setCleared((v) => !v);
  };

  return (
    <SettingsSubpageShell title="Data & Storage">
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tepla-accent/15 text-tepla-accent">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-tepla-text">Storage used</p>
              <p className="text-xs text-tepla-text-muted">
                Local app data · {formatBytes(storageUsed)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="text-xs leading-relaxed text-tepla-text-muted">
              Clears cached preferences and temporary data. Your account and saved settings
              are kept.
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={handleClearCache}>
              <Trash2 className="h-4 w-4" />
              Clear cache
            </Button>
          </CardContent>
        </Card>
      </div>
    </SettingsSubpageShell>
  );
}
