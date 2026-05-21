"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui.store";

const themes = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "oled", label: "OLED" },
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
] as const;
const accentColors = ["#6C63FF", "#2AABEE", "#4CAF50", "#FF5757", "#FFB74D"];

export default function AppearanceSettingsPage() {
  const { theme, accentColor, setTheme, setAccentColor } = useUIStore();

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
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
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
