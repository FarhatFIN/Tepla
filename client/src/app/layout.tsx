import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tepla Messenger",
  description: "Modern encrypted messenger with calls, stories, bots, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
