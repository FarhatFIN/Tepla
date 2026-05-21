"use client";

import { useEffect } from "react";
import { applyThemeToDocument } from "@/lib/theme";
import { useUIStore } from "@/stores/ui.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((state) => state.theme);
  const accentColor = useUIStore((state) => state.accentColor);
  const fontSize = useUIStore((state) => state.fontSize);
  const chatBackground = useUIStore((state) => state.chatBackground);

  useEffect(() => {
    const mode = theme === "light" ? "light" : "dark";
    applyThemeToDocument(mode);
    document.documentElement.style.setProperty("--tepla-accent", accentColor);
    document.documentElement.style.setProperty(
      "--tepla-accent-hover",
      accentColor,
    );
    document.documentElement.style.setProperty(
      "--tepla-chat-background",
      chatBackground,
    );
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [theme, accentColor, fontSize, chatBackground]);

  return <>{children}</>;
}
