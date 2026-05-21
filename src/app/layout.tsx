import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tepla | Secure, AI-Native Messenger",
  description:
    "Tepla is a startup-grade, AI-native messenger focused on premium real-time collaboration.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} bg-tepla-bg text-tepla-text antialiased`}
      >
        <ThemeProvider>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(123,97,255,0.14),transparent_48%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.1),transparent_58%),var(--tepla-bg)]">
            <main className="mx-auto flex min-h-screen max-w-[1440px] px-2 py-2 sm:px-4">
              <div className="tepla-glass relative flex h-[calc(100vh-1rem)] flex-1 overflow-hidden rounded-3xl border border-tepla-border">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
