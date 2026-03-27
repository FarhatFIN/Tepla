"use client";
import { useState } from "react";
import { motion } from "framer-motion";

const languageOptions = [
  { code: "ru", flag: "\u{1F1F7}\u{1F1FA}", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
  { code: "en", flag: "\u{1F1FA}\u{1F1F8}", name: "English" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", name: "Deutsch" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", name: "Fran\u00E7ais" },
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", name: "Espa\u00F1ol" },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", name: "\u4E2D\u6587" },
  { code: "kk", flag: "\u{1F1F0}\u{1F1FF}", name: "\u049A\u0430\u0437\u0430\u049B\u0448\u0430" },
  { code: "uz", flag: "\u{1F1FA}\u{1F1FF}", name: "O\u2018zbek" },
  { code: "uk", flag: "\u{1F1FA}\u{1F1E6}", name: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430" },
  { code: "ar", flag: "\u{1F1E6}\u{1F1EA}", name: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
];

interface LanguageSelectorProps {
  onSelect: (code: string) => void;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const [selected, setSelected] = useState(() => {
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.split("-")[0];
      return languageOptions.find((l) => l.code === browserLang)?.code || "en";
    }
    return "en";
  });

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#130D24] px-4" style={{ backgroundImage: "url('/wallpaper/tepla-pattern.svg')", backgroundSize: "400px 400px" }}>
      <div className="absolute inset-0 bg-[rgba(10,6,18,0.88)]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="auth-card relative z-10 p-8 w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #5B21B6, #6C3DE8)", boxShadow: "0 0 24px rgba(108,61,232,0.4)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">Tepla</h1>
        </div>

        <h2 className="text-center text-lg text-[#F0EAFF] mb-1">Choose your language</h2>
        <p className="text-center text-sm text-[#9B89C4] mb-6">{"\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A"}</p>

        <div className="grid grid-cols-2 gap-2">
          {languageOptions.map((lang, i) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(lang.code)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                selected === lang.code
                  ? "bg-[rgba(108,61,232,0.2)] border-2 border-[#6C3DE8]"
                  : "bg-white/5 border-2 border-transparent hover:bg-[#2A1D4A]"
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`text-sm font-medium ${selected === lang.code ? "text-white" : "text-[#9B89C4]"}`}>{lang.name}</span>
              {selected === lang.code && (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D46A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></motion.svg>
              )}
            </motion.button>
          ))}
        </div>

        <motion.button
          onClick={() => onSelect(selected)}
          whileHover={{ filter: "brightness(1.1)" }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 w-full tepla-btn-primary h-[52px] text-[16px] font-medium"
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
