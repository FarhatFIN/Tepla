"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/languages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const createHandleFromName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_ ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 24);

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [birthDate, setBirthDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedDisplayName = displayName.trim();
  const normalizedUsername = username
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  const suggestedHandle = createHandleFromName(normalizedDisplayName || "tepla_founder");
  const hasContact = phone.trim().length > 0 || email.trim().length > 0;
  const usernameValid = normalizedUsername.length >= 4;

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();

    if (!hasContact) {
      setError("Add a phone number or email so your team can recover access.");
      return;
    }

    if (!usernameValid) {
      setError("Username must be at least 4 characters using letters, numbers, or underscores.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "register",
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          username: normalizedUsername,
          displayName: normalizedDisplayName || undefined,
          language,
          birthDate: birthDate || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Registration failed.");
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
        throw new Error("Account created, but no user session was returned.");
      }

      setSession({
        user: payload.user,
        accessToken: `session-${payload.user.id}`,
        refreshToken: `refresh-${payload.user.id}`,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Founder-ready onboarding
          </span>
        </div>

        <div>
          <CardTitle className="text-2xl">Create your Tepla account</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">
            Set up a strong handle, add a recovery path, and get your team into a product
            that already feels launch-ready.
          </CardDescription>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">What strong onboarding looks like</p>
              <p className="text-xs leading-5 text-tepla-text-muted">
                Clear identity, reliable recovery, and a handle your team can remember in one
                pass.
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Username
            </label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@handle"
              required
            />
            <p className="text-[11px] text-tepla-text-muted">
              Public handle: @{normalizedUsername || suggestedHandle}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should your team see you?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Interface language
            </label>
            <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-tepla-text-secondary">
              Birth date
            </label>
            <Input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-tepla-text-secondary">
                Phone number
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-tepla-text-secondary">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@tepla.app"
              />
            </div>
          </div>

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}

          <Button
            type="submit"
            disabled={isSubmitting || !hasContact || !usernameValid}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-tepla-text-muted">
                Profile preview
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {normalizedDisplayName || "Your Name"}
              </p>
              <p className="text-sm text-slate-300">@{normalizedUsername || suggestedHandle}</p>
              <p className="mt-1 text-xs text-tepla-text-muted">
                Language: {SUPPORTED_LANGUAGES.find((item) => item.code === language)?.label}
              </p>
              {birthDate ? (
                <p className="mt-1 text-xs text-tepla-text-muted">
                  Birth date: {birthDate}
                </p>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              Premium-ready
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-tepla-text-muted">
            Clean handles make mentions, search, and contact sharing feel much more polished.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-tepla-text-muted">
          <Link href="/login" className="transition-colors hover:text-white">
            Already have an account?
          </Link>
          <Link href="/qr" className="transition-colors hover:text-white">
            Pair by QR instead
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
