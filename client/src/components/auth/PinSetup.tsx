"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface PinSetupProps {
  onComplete: (pin: string) => void;
  onSkip: () => void;
}

export default function PinSetup({ onComplete, onSkip }: PinSetupProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState(false);
  const t = useTranslation();

  const handlePress = useCallback((num: string) => {
    if (step === "enter") {
      if (pin.length >= 6) return;
      const next = pin + num;
      setPin(next);
      if (next.length === 6) {
        setTimeout(() => setStep("confirm"), 200);
      }
    } else {
      if (confirmPin.length >= 6) return;
      const next = confirmPin + num;
      setConfirmPin(next);
      if (next.length === 6) {
        if (next === pin) {
          onComplete(next);
        } else {
          setError(true);
          setTimeout(() => {
            setError(false);
            setConfirmPin("");
            setStep("enter");
            setPin("");
          }, 600);
        }
      }
    }
  }, [pin, confirmPin, step, onComplete]);

  const handleDelete = useCallback(() => {
    if (step === "enter") {
      setPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
  }, [step]);

  const currentPin = step === "enter" ? pin : confirmPin;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#130D24] px-4" style={{ backgroundImage: "url('/wallpaper/tepla-pattern.svg')", backgroundSize: "400px 400px" }}>
      <div className="absolute inset-0 bg-[rgba(10,6,18,0.88)]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#F0EAFF]">
            {step === "enter" ? t("setup_pin") : t("confirm_pin")}
          </h2>
          <p className="mt-2 text-sm text-[#9B89C4]">{t("pin_subtitle")}</p>
        </div>

        {/* PIN dots */}
        <motion.div className="flex gap-3" animate={error ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              animate={i < currentPin.length ? { scale: [0, 1.2, 1], background: error ? "#EF4444" : "#6C3DE8" } : { scale: 1, background: "rgba(108,61,232,0.2)" }}
              className="h-4 w-4 rounded-full"
              style={{ background: i < currentPin.length ? (error ? "#EF4444" : "#6C3DE8") : "rgba(108,61,232,0.2)" }}
            />
          ))}
        </motion.div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"].map((key) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (key === "del") handleDelete();
                else if (key === "ok") { /* handled by auto-advance */ }
                else handlePress(key);
              }}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-medium transition-colors ${
                key === "del" ? "text-[#9B89C4]" :
                key === "ok" ? (currentPin.length === 6 ? "bg-[#6C3DE8] text-white" : "text-[#5C4D87]") :
                "bg-white/[0.08] text-white hover:bg-white/[0.12] active:bg-white/[0.16]"
              }`}
            >
              {key === "del" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              ) : key === "ok" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              ) : key}
            </motion.button>
          ))}
        </div>

        {/* Skip */}
        <button onClick={onSkip} className="text-sm text-[#5C4D87] hover:text-[#8B5CF6] transition-colors">
          {t("skip_for_now")}
        </button>
      </motion.div>
    </div>
  );
}
