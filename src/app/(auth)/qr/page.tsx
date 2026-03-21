"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const QR_SIZE = 21;

const buildQrGrid = (seed: number) => {
  const matrix: boolean[][] = [];
  let current = seed;

  for (let row = 0; row < QR_SIZE; row += 1) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < QR_SIZE; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col > QR_SIZE - 8) ||
        (row > QR_SIZE - 8 && col < 7);

      if (inFinder) {
        const finderRow = row < 7 ? row : row - (QR_SIZE - 7);
        const finderCol = col < 7 ? col : col - (QR_SIZE - 7);
        const outer = finderRow === 0 || finderRow === 6 || finderCol === 0 || finderCol === 6;
        const inner =
          finderRow >= 2 && finderRow <= 4 && finderCol >= 2 && finderCol <= 4;
        rowCells.push(outer || inner);
        continue;
      }

      current = (current * 1664525 + 1013904223) % 4294967296;
      rowCells.push((current & 1) === 1);
    }
    matrix.push(rowCells);
  }

  return matrix;
};

const pairingSteps = [
  "Open Tepla on your phone.",
  "Go to Settings and tap Devices.",
  "Scan this token to link the desktop session.",
];

export default function QRLoginPage() {
  const [seed, setSeed] = useState(() => Date.now());
  const [expiresIn, setExpiresIn] = useState(45);

  useEffect(() => {
    if (expiresIn <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setExpiresIn((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [expiresIn]);

  const refreshCode = () => {
    setSeed(Date.now());
    setExpiresIn(45);
  };

  const matrix = buildQrGrid(seed);

  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(2,8,26,0.82))]">
      <CardHeader className="space-y-4 border-white/10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-tepla-text-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-300">
            Secure device linking
          </span>
        </div>

        <div>
          <CardTitle className="text-2xl">Log in with QR code</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">
            Pair this desktop with your phone in seconds. The token refreshes frequently so
            the session stays private and short-lived.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="rounded-[32px] border border-white/10 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <div
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${QR_SIZE}, minmax(0, 1fr))` }}
            >
              {matrix.flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cell ? "h-2.5 w-2.5 rounded-[2px] bg-black" : "h-2.5 w-2.5 rounded-[2px] bg-white"}
                  />
                )),
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Pairing token active</p>
              <p className="mt-1 text-xs text-tepla-text-muted">
                Refreshes automatically to protect device linking.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-sky-300">
              {expiresIn}s
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {pairingSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-white">
                {index + 1}
              </span>
              <p className="text-sm text-slate-300">{step}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Why teams like QR pairing</p>
              <p className="text-xs leading-5 text-tepla-text-muted">
                It removes password friction, speeds up device linking, and feels much more
                premium in a live product demo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="subtle" size="sm" onClick={refreshCode}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh code
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/login">
              <Smartphone className="h-3.5 w-3.5" />
              Use phone login
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
