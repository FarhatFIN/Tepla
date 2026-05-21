"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import type { BinaryShieldIssue } from "@/lib/binary-shield-demo";
import { cn } from "@/lib/utils";

type BinaryShieldStepProps = {
  shield: BinaryShieldIssue;
  onContinue: () => void;
};

const maskValue = (value: string) => "•".repeat(Math.min(value.length, 12));

function ProtectedBlock({
  label,
  value,
  revealed,
  obscured,
  mono = false,
}: {
  label: string;
  value: string;
  revealed: boolean;
  obscured: boolean;
  mono?: boolean;
}) {
  const visible = revealed && !obscured;
  return (
    <div className="relative overflow-hidden rounded-xl border border-tepla-border/80 bg-tepla-bg-tertiary/60 p-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-tepla-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "break-all text-sm leading-relaxed tepla-shield-sensitive",
          mono && "font-mono tracking-[0.12em]",
          visible ? "text-tepla-text" : "tracking-widest text-tepla-text-muted",
        )}
        aria-hidden={!visible}
      >
        {visible ? value : maskValue(value)}
      </p>
    </div>
  );
}

export function BinaryShieldStep({ shield, onContinue }: BinaryShieldStepProps) {
  const [revealed, setRevealed] = useState(false);
  const { obscured, clearObscured } = useScreenProtection(true);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative space-y-4"
    >
      {obscured ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-tepla-bg/90 px-6 text-center backdrop-blur-xl">
          <ShieldCheck className="h-8 w-8 text-tepla-accent" />
          <p className="text-sm font-medium text-tepla-text">Контент скрыт</p>
          <p className="text-xs text-tepla-text-muted">
            Обнаружена попытка снимка экрана или записи. Коды временно скрыты.
          </p>
          <Button type="button" size="sm" variant="subtle" onClick={clearObscured}>
            Показать снова
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "tepla-shield-protected space-y-4",
          obscured && "pointer-events-none select-none",
        )}
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tepla-accent/15 text-tepla-accent">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h2 className="mt-3 text-lg font-semibold text-tepla-text">Tepla Binary Shield</h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-tepla-text-muted">
            Сохраните одноразовые A/B-коды восстановления. Они обновляются после входа.
            Скриншоты и запись экрана на этой странице блокируются.
          </p>
        </div>

        <Button
          type="button"
          variant={revealed ? "outline" : "primary"}
          className="w-full gap-2"
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? (
            <>
              <EyeOff className="h-4 w-4" />
              Скрыть
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Раскрыть
            </>
          )}
        </Button>

        {shield.seedPhrase ? (
          <ProtectedBlock
            label="Master seed"
            value={shield.seedPhrase}
            revealed={revealed}
            obscured={obscured}
            mono
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {shield.recoveryPatterns.map((item) => (
            <ProtectedBlock
              key={item.id}
              label={`Код · ${item.usesLeft} исп.`}
              value={item.pattern}
              revealed={revealed}
              obscured={obscured}
              mono
            />
          ))}
        </div>

        {shield.nextManualRotationAt ? (
          <p className="text-center text-[11px] text-tepla-text-muted">
            Следующая ручная ротация:{" "}
            {new Date(shield.nextManualRotationAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>

      <Button type="button" className="w-full" onClick={onContinue}>
        Продолжить в Tepla
      </Button>
    </motion.div>
  );
}
