import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--tepla-bg)",
        foreground: "var(--tepla-foreground)",
        "tepla-bg": "var(--tepla-bg)",
        "tepla-bg-secondary": "var(--tepla-bg-secondary)",
        "tepla-bg-tertiary": "var(--tepla-bg-tertiary)",
        "tepla-surface": "var(--tepla-surface)",
        "tepla-surface-hover": "var(--tepla-surface-hover)",
        "tepla-accent": "var(--tepla-accent)",
        "tepla-accent-hover": "var(--tepla-accent-hover)",
        "tepla-text": "var(--tepla-text)",
        "tepla-text-secondary": "var(--tepla-text-secondary)",
        "tepla-text-muted": "var(--tepla-text-muted)",
        "tepla-border": "var(--tepla-border)",
        "tepla-sent": "var(--tepla-sent)",
        "tepla-received": "var(--tepla-received)",
        "tepla-online": "var(--tepla-online)",
        "tepla-danger": "var(--tepla-danger)",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "10px",
      },
      boxShadow: {
        glass: "0 18px 60px rgba(0, 0, 0, 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [],
};

export default config;
