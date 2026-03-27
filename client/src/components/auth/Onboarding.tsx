"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="35" stroke="#6C3DE8" strokeWidth="2" opacity="0.3"/>
        <path d="M25 45L35 35L45 50L55 30" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="20" y="20" width="12" height="12" rx="2" fill="#6C3DE8" opacity="0.4"/>
        <path d="M38 18L42 24L38 30" stroke="#00D46A" strokeWidth="1.5" fill="none"/>
        <circle cx="55" cy="25" r="6" fill="#6C3DE8" opacity="0.3"/>
        <path d="M52 25L55 22L58 25" stroke="white" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    titleKey: "onboarding_1_title",
    subtitleKey: "onboarding_1_subtitle",
  },
  {
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="25" stroke="#8B5CF6" strokeWidth="2"/>
        <circle cx="40" cy="36" r="8" stroke="#F0EAFF" strokeWidth="2"/>
        <line x1="32" y1="28" x2="48" y2="44" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M30 55C30 48 34 44 40 44C46 44 50 48 50 55" stroke="#8B5CF6" strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
    titleKey: "onboarding_2_title",
    subtitleKey: "onboarding_2_subtitle",
  },
  {
    icon: (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="22" y="22" width="36" height="36" rx="12" fill="#6C3DE8" opacity="0.2"/>
        <circle cx="40" cy="36" r="6" fill="#8B5CF6"/>
        <path d="M32 50C32 45 35 42 40 42C45 42 48 45 48 50" stroke="#8B5CF6" strokeWidth="2"/>
        <circle cx="56" cy="20" r="3" fill="#00D46A"/>
        <circle cx="24" cy="20" r="2" fill="#F59E0B"/>
        <circle cx="60" cy="40" r="2" fill="#8B5CF6"/>
        <path d="M15 35L18 32L21 35" stroke="#C4B5FD" strokeWidth="1" fill="none"/>
        <path d="M59 55L62 52L65 55" stroke="#C4B5FD" strokeWidth="1" fill="none"/>
      </svg>
    ),
    titleKey: "onboarding_3_title",
    subtitleKey: "onboarding_3_subtitle",
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const t = useTranslation();

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else onComplete();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#130D24] px-6" style={{ backgroundImage: "url('/wallpaper/tepla-pattern.svg')", backgroundSize: "400px 400px" }}>
      <div className="absolute inset-0 bg-[rgba(10,6,18,0.88)]" />

      <button onClick={onComplete} className="fixed top-6 right-6 z-20 text-sm text-[#5C4D87] hover:text-[#9B89C4] transition-colors">
        {t("skip")}
      </button>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-8">{slides[current].icon}</div>
            <h2 className="text-2xl font-bold text-[#F0EAFF]">{t(slides[current].titleKey)}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#9B89C4]">{t(slides[current].subtitleKey)}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="mt-12 flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i === current ? 1 : 0.8, background: i === current ? "#6C3DE8" : "#3D2B6B" }}
              className="h-2 w-2 rounded-full"
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          onClick={next}
          whileHover={{ filter: "brightness(1.1)" }}
          whileTap={{ scale: 0.97 }}
          className="mt-8 w-full tepla-btn-primary h-[52px] text-[16px] font-medium"
        >
          {current === slides.length - 1 ? t("get_started") : t("next")}
        </motion.button>
      </div>
    </div>
  );
}
