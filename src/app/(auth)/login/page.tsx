"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const trustSignals = [
  "Encrypted device-first sign in",
  "Low-friction operator onboarding",
  "Fast recovery with phone verification",
];

export default function LoginPage() {
  const router = useRouter();
  const { status, setSession } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const normalizedPhone = phone.trim();
  const normalizedEmail = email.trim();
  const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);
  const canRequestCode = normalizedPhone.length >= 8;
  const canVerify = canRequestCode && normalizedOtp.length === 6;

  const stepLabel = otpSent ? "Step 2 of 2" : "Step 1 of 2";
  const helperText = otpSent
    ? `Enter the 6-digit code sent to ${normalizedPhone || "your phone"}.`
    : "Use your phone number to receive a one-time code and get back into Tepla fast.";

  useEffect(() => {
    if (status === "signed_in") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cooldown]);

  useEffect(() => {
    setError(null);
  }, [phone, email, otp]);

  const statusPill = otpSent
    ? "Verification in progress"
    : "Secure startup login";

  const requestOtp = async () => {
    if (!canRequestCode) {
      setError("Enter a valid phone number first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "start_phone_login",
          phone: normalizedPhone,
          email: normalizedEmail || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to start login.");
      }

      setOtpSent(true);
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    await requestOtp();
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!canVerify) {
      setError("Enter the full 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "verify_phone_login",
          phone: normalizedPhone,
          otp: normalizedOtp,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to verify code.");
      }

      const payload = (await response.json()) as {
        ok: boolean;
        user?: {
          id: string;
          username: string;
          displayName: string | null;
          avatarUrl: string | null;
          language: string;
          birthDate: string | null;
          usernameColor: string | null;
          animatedAvatarEnabled: boolean;
          voiceStatusUrl: string | null;
          voiceStatusDurationSeconds: number | null;
          statusEmoji: string | null;
        };
      };

      if (!payload.user) {
        throw new Error("No user returned from login.");
      }

      setSession({
        user: payload.user,
        accessToken: `session-${payload.user.id}`,
        refreshToken: `refresh-${payload.user.id}`,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(2,8,26,0.82))]">
      <CardHeader className="space-y-4 border-white/10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-tepla-text-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-300">
            {statusPill}
          </span>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-tepla-text-muted">
            {stepLabel}
          </p>
          <CardTitle className="mt-2 text-2xl">Welcome back to Tepla</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">
            {helperText}
          </CardDescription>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {trustSignals.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Phone number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 555 000 0000"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Work email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optional backup for team access"
            />
          </div>

          {otpSent ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-tepla-text-secondary">
                One-time code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="000000"
                required
              />
              <p className="text-[11px] text-tepla-text-muted">
                This code expires quickly to keep device access tight and safe.
              </p>
            </div>
          ) : null}

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}

          <Button
            type="submit"
            disabled={isSubmitting || (otpSent ? !canVerify : !canRequestCode)}
            className="w-full"
          >
            {otpSent ? "Verify code" : "Send secure code"}
          </Button>
        </form>

        {otpSent ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              disabled={isSubmitting || cooldown > 0}
              onClick={() => {
                void requestOtp();
              }}
            >
              Resend code{cooldown > 0 ? ` in ${cooldown}s` : ""}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setCooldown(0);
              }}
            >
              Change number
            </Button>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <div>
              <p className="text-sm font-medium text-white">Fast login, startup-safe defaults</p>
              <p className="mt-1 text-xs leading-5 text-tepla-text-muted">
                Phone verification stays friction-light while protecting access to the
                conversations that matter most.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-tepla-text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className="transition-colors hover:text-white">
              Create account
            </Link>
            <Link
              href="/qr"
              className="inline-flex items-center gap-1 transition-colors hover:text-white"
            >
              <QrCode className="h-3.5 w-3.5" />
              Use QR
            </Link>
          </div>
          <span className="inline-flex items-center gap-1">
            <Smartphone className="h-3.5 w-3.5" />
            Mobile-first access
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
