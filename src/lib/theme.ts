export type TeplaThemeMode = "dark" | "light";

export type TeplaThemeColors = {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  surface: string;
  surfaceHover: string;
  accent: string;
  accentHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  sent: string;
  received: string;
  online: string;
  danger: string;
};

export type TeplaThemeConfig = Record<TeplaThemeMode, TeplaThemeColors>;

export const teplaTheme: TeplaThemeConfig = {
  dark: {
    bg: "#0F1117",
    bgSecondary: "#1A1D27",
    bgTertiary: "#252836",
    surface: "rgba(255,255,255,0.05)",
    surfaceHover: "rgba(255,255,255,0.08)",
    accent: "#7B61FF",
    accentHover: "#9580FF",
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.6)",
    textMuted: "rgba(255,255,255,0.35)",
    border: "rgba(255,255,255,0.08)",
    sent: "#6C63FF",
    received: "#1E2235",
    online: "#4CAF50",
    danger: "#FF5757",
  },
  light: {
    bg: "#F5F5F5",
    bgSecondary: "#FFFFFF",
    bgTertiary: "#E5E7EB",
    surface: "rgba(0,0,0,0.04)",
    surfaceHover: "rgba(0,0,0,0.08)",
    accent: "#7B61FF",
    accentHover: "#9580FF",
    text: "#1A1A1A",
    textSecondary: "rgba(0,0,0,0.7)",
    textMuted: "rgba(0,0,0,0.45)",
    border: "rgba(0,0,0,0.08)",
    sent: "#6C63FF",
    received: "#FFFFFF",
    online: "#4CAF50",
    danger: "#FF5757",
  },
};

export const applyThemeToDocument = (mode: TeplaThemeMode): void => {
  if (typeof document === "undefined") {
    return;
  }

  const palette = teplaTheme[mode];
  const root = document.documentElement;

  root.classList.toggle("dark", mode === "dark");

  root.style.setProperty("--tepla-bg", palette.bg);
  root.style.setProperty("--tepla-bg-secondary", palette.bgSecondary);
  root.style.setProperty("--tepla-bg-tertiary", palette.bgTertiary);
  root.style.setProperty("--tepla-surface", palette.surface);
  root.style.setProperty("--tepla-surface-hover", palette.surfaceHover);
  root.style.setProperty("--tepla-accent", palette.accent);
  root.style.setProperty("--tepla-accent-hover", palette.accentHover);
  root.style.setProperty("--tepla-text", palette.text);
  root.style.setProperty("--tepla-text-secondary", palette.textSecondary);
  root.style.setProperty("--tepla-text-muted", palette.textMuted);
  root.style.setProperty("--tepla-border", palette.border);
  root.style.setProperty("--tepla-sent", palette.sent);
  root.style.setProperty("--tepla-received", palette.received);
  root.style.setProperty("--tepla-online", palette.online);
  root.style.setProperty("--tepla-danger", palette.danger);
};

