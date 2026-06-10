"use client";
import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export default function OtpInput({ length = 6, onComplete, disabled }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function handleChange(index: number, val: string) {
    if (disabled) return;
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    setValues(next);

    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }

    const code = next.join("");
    if (code.length === length && next.every((v) => v !== "")) {
      onComplete(code);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (values[index]) {
        const next = [...values];
        next[index] = "";
        setValues(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        const next = [...values];
        next[index - 1] = "";
        setValues(next);
      }
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const next = [...values];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setValues(next);

    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();

    if (pasted.length === length) {
      onComplete(pasted);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2.5">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`h-14 w-11 rounded-xl bg-[var(--bg-input)] text-center text-xl font-bold outline-none transition-all
            ${val ? "ring-2 ring-[var(--accent)]" : "ring-1 ring-[var(--border)]"}
            focus:ring-2 focus:ring-[var(--accent)]
            disabled:opacity-50 disabled:cursor-not-allowed`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
