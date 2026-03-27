"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface LockScreenProps {
  onUnlock: () => void;
  pinLength?: 4 | 6;
}

export default function LockScreen({ onUnlock, pinLength = 4 }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const verify = useCallback((code: string) => {
    if (lockedUntil > Date.now()) return;
    const stored = localStorage.getItem("tepla-passcode");
    if (!stored) { onUnlock(); return; }
    if (code === stored) {
      setAttempts(0);
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 500);
      if (newAttempts >= 10) setLockedUntil(Date.now() + 3600000);
      else if (newAttempts >= 5) setLockedUntil(Date.now() + 60000);
    }
  }, [attempts, lockedUntil, onUnlock]);

  const handleInput = (digit: string) => {
    if (lockedUntil > Date.now()) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === pinLength) verify(next);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const isLocked = lockedUntil > Date.now();
  const numpad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#130D24]" style={{ backgroundImage: "url('/wallpaper/tepla-pattern.svg')", backgroundSize: "400px 400px" }}>
      <div className="absolute inset-0 bg-[rgba(10,6,18,0.88)]" />
      <div className="relative z-10 flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: "linear-gradient(135deg, #5B21B6, #6C3DE8)", boxShadow: "0 0 24px rgba(108,61,232,0.4)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div className="mb-2 text-3xl font-bold text-white">Tepla</div>
      <p className="mb-6 text-sm text-[#9B89C4]">Enter your passcode</p>
      {isLocked && <p className="mb-4 text-sm text-red-400">Locked. Try again in {countdown}s</p>}
      <div className={`flex gap-3 mb-8 ${error ? "animate-shake" : ""}`}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? (error ? "bg-red-500" : "bg-[#6C3DE8]") + " scale-110" : "bg-[rgba(108,61,232,0.2)]"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 w-64">
        {numpad.map((key, i) => (
          key === "" ? <div key={i} /> :
          key === "⌫" ? (
            <button key={i} onClick={handleBackspace} disabled={isLocked} className="flex items-center justify-center h-14 rounded-2xl text-[#9B89C4] hover:bg-[rgba(108,61,232,0.15)] transition-colors disabled:opacity-30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          ) : (
            <button key={i} onClick={() => handleInput(key)} disabled={isLocked} className="flex items-center justify-center h-14 rounded-2xl text-xl font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] active:bg-[rgba(108,61,232,0.3)] transition-colors disabled:opacity-30">
              {key}
            </button>
          )
        ))}
      </div>
      <input ref={inputRef} type="password" className="sr-only" autoFocus onKeyDown={(e) => {
        if (e.key >= "0" && e.key <= "9") handleInput(e.key);
        else if (e.key === "Backspace") handleBackspace();
      }} />
      </div>
    </div>
  );
}

export function PasscodeSetup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"new" | "confirm">("new");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [error, setError] = useState(false);

  const handleInput = (digit: string) => {
    if (step === "new") {
      const next = pin + digit;
      setPin(next);
      if (next.length === pinLength) setStep("confirm");
    } else {
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === pinLength) {
        if (next === pin) {
          localStorage.setItem("tepla-passcode", pin);
          localStorage.setItem("tepla-passcode-length", String(pinLength));
          onDone();
        } else {
          setError(true);
          setConfirmPin("");
          setTimeout(() => setError(false), 500);
        }
      }
    }
  };

  const currentPin = step === "new" ? pin : confirmPin;
  const numpad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex flex-col items-center py-4">
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setPinLength(4); setPin(""); setConfirmPin(""); setStep("new"); }} className={`px-3 py-1 rounded-lg text-xs ${pinLength === 4 ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)]"}`}>4 digits</button>
        <button onClick={() => { setPinLength(6); setPin(""); setConfirmPin(""); setStep("new"); }} className={`px-3 py-1 rounded-lg text-xs ${pinLength === 6 ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)]"}`}>6 digits</button>
      </div>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{step === "new" ? "Enter new passcode" : "Confirm passcode"}</p>
      <div className={`flex gap-3 mb-6 ${error ? "animate-shake" : ""}`}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < currentPin.length ? "bg-[var(--accent)]" : "bg-[var(--bg-input)] border border-[var(--border)]"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-56">
        {numpad.map((key, i) => (
          key === "" ? <div key={i} /> :
          key === "⌫" ? (
            <button key={i} onClick={() => { if (step === "new") setPin(p => p.slice(0, -1)); else setConfirmPin(p => p.slice(0, -1)); }} className="flex items-center justify-center h-12 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </button>
          ) : (
            <button key={i} onClick={() => handleInput(key)} className="flex items-center justify-center h-12 rounded-xl text-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--accent-soft)]">
              {key}
            </button>
          )
        ))}
      </div>
    </div>
  );
}

export function useAutoLock() {
  const [locked, setLocked] = useState(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const hasPasscode = !!localStorage.getItem("tepla-passcode");
    if (!hasPasscode) return;

    const updateActivity = () => { lastActivity.current = Date.now(); };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const check = setInterval(() => {
      const autoLockSeconds = parseInt(localStorage.getItem("tepla-auto-lock") || "0");
      if (!autoLockSeconds) return;
      if (Date.now() - lastActivity.current > autoLockSeconds * 1000) setLocked(true);
    }, 30000);

    const onVisibility = () => {
      if (document.hidden) {
        const autoLockSeconds = parseInt(localStorage.getItem("tepla-auto-lock") || "0");
        if (autoLockSeconds && autoLockSeconds <= 60) setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(check);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { locked, setLocked, unlock: () => setLocked(false) };
}
