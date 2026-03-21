"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";
import { usePremium } from "@/hooks/usePremium";

const themes = [
  { id: "dark", label: "Dark", premium: false },
  { id: "light", label: "Light", premium: false },
  { id: "oled", label: "OLED", premium: false },
  { id: "aurora", label: "Aurora", premium: true },
  { id: "sunset", label: "Sunset", premium: true },
] as const;
const accentColors = ["#6C63FF", "#2AABEE", "#4CAF50", "#FF5757", "#FFB74D"];

export default function AppearanceSettingsPage() {
  const { theme, accentColor, setTheme, setAccentColor } = useUIStore();
  const { isPremium } = usePremium();

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-lg p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-xs text-tepla-text-muted">Theme</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <Button
                  key={t.id}
                  variant={theme === t.id ? "primary" : "outline"}
                  size="sm"
                  disabled={t.premium && !isPremium}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                  {t.premium ? <Crown className="h-3.5 w-3.5 text-amber-300" /> : null}
                </Button>
              ))}
            </div>
            {!isPremium ? (
              <p className="mt-2 text-xs text-tepla-text-muted">
                Premium unlocks Aurora and Sunset themes.
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-xs text-tepla-text-muted">Accent color</p>
            <div className="flex gap-2">
              {accentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: accentColor === color ? "white" : "transparent",
                  }}
                  onClick={() => setAccentColor(color)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
