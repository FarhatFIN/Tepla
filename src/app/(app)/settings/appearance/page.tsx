"use client";

import { Moon, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

const chatBackgroundPresets = [
  "#0F1117",
  "#1A1D27",
  "#12182B",
  "#1B2638",
  "#1E2235",
  "#252836",
];

export default function AppearanceSettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const fontSize = useUIStore((s) => s.fontSize);
  const chatBackground = useUIStore((s) => s.chatBackground);
  const setTheme = useUIStore((s) => s.setTheme);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const setChatBackground = useUIStore((s) => s.setChatBackground);

  const resolvedTheme = theme === "light" ? "light" : "dark";

  return (
    <SettingsSubpageShell title="Appearance">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-tepla-text">Theme</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={resolvedTheme === "dark" ? "primary" : "outline"}
                className="gap-2"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                type="button"
                variant={resolvedTheme === "light" ? "primary" : "outline"}
                className="gap-2"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-tepla-text">Font size</h3>
              <span className="text-xs text-tepla-text-muted">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={13}
              max={20}
              step={1}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-tepla-bg-tertiary accent-tepla-accent"
            />
            <div className="flex justify-between text-[11px] text-tepla-text-muted">
              <span>Small</span>
              <span>Large</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-tepla-text">Chat background</h3>
            <div className="flex flex-wrap gap-2">
              {chatBackgroundPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Background ${color}`}
                  className={cn(
                    "h-9 w-9 rounded-xl border-2 tepla-interactive hover:scale-105",
                    chatBackground === color
                      ? "border-tepla-accent ring-2 ring-tepla-accent/40"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setChatBackground(color)}
                />
              ))}
            </div>
            <label className="flex items-center gap-3">
              <input
                type="color"
                value={chatBackground}
                onChange={(event) => setChatBackground(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-tepla-border bg-transparent"
              />
              <span className="text-xs text-tepla-text-muted">Custom color</span>
            </label>
          </CardContent>
        </Card>
      </div>
    </SettingsSubpageShell>
  );
}
