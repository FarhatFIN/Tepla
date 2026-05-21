"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth.store";
import { BinaryShieldStep } from "@/components/auth/BinaryShieldStep";
import {
  createDemoBinaryShield,
  parseBinaryShieldFromResponse,
  type BinaryShieldIssue,
} from "@/lib/binary-shield-demo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BIO_MAX = 150;

const normalizeUsername = (value: string) =>
  value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

const validateStep1 = (email: string, password: string, username: string) => {
  const errors: Record<string, string> = {};
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!password || password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  const handle = normalizeUsername(username);
  if (!handle || handle.length < 4) {
    errors.username = "Username must be at least 4 characters.";
  } else if (!/^[a-z0-9_]+$/.test(handle)) {
    errors.username = "Use only letters, numbers, and underscores.";
  }
  return errors;
};

const pageTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
};

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [binaryShield, setBinaryShield] = useState<BinaryShieldIssue | null>(null);
  const [registeredUser, setRegisteredUser] = useState<{
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
  } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  const handleAvatarPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, avatar: "Please choose an image file." }));
      return;
    }
    setAvatarFile(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.avatar;
      return next;
    });
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const goToStep2 = () => {
    const stepErrors = validateStep1(email, password, username);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setStep(2);
  };

  const uploadAvatarAfterRegister = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");
    formData.append("userId", userId);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      return null;
    }

    const payload = (await uploadResponse.json()) as { url: string };
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: payload.url }),
    });
    return payload.url;
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setGlobalError(null);

    if (bio.length > BIO_MAX) {
      setErrors({ bio: `Bio must be ${BIO_MAX} characters or less.` });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "register",
          email: email.trim(),
          username: normalizedUsername,
          password,
          displayName: bio.trim() || undefined,
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

      let avatarUrl = payload.user.avatarUrl;
      if (avatarFile) {
        avatarUrl = (await uploadAvatarAfterRegister(avatarFile, payload.user.id)) ?? avatarUrl;
      }

      const user = { ...payload.user, avatarUrl };
      setRegisteredUser(user);

      const shieldFromApi = parseBinaryShieldFromResponse(payload);
      setBinaryShield(shieldFromApi ?? createDemoBinaryShield());
      setStep(3);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishRegistration = () => {
    if (!registeredUser) return;
    setSession({
      user: registeredUser,
      accessToken: `session-${registeredUser.id}`,
      refreshToken: `refresh-${registeredUser.id}`,
    });
    router.replace("/");
  };

  return (
    <Card className="overflow-hidden border-tepla-border/80 bg-tepla-bg-secondary/90 shadow-glass">
      <CardHeader className="space-y-3 border-tepla-border/70 pb-2">
        <div className="flex items-center justify-between gap-3">
          {step < 3 ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-tepla-text-muted tepla-interactive hover:text-tepla-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Sign in
            </Link>
          ) : (
            <span className="text-xs text-tepla-text-muted">Защищённый экран</span>
          )}
          <span className="text-xs font-medium text-tepla-text-muted">
            Step {step} of 3
          </span>
        </div>
        <div>
          <CardTitle className="text-xl">
            {step === 3 ? "Tepla Binary Shield" : "Create account"}
          </CardTitle>
          <CardDescription className="mt-1.5 text-sm">
            {step === 1
              ? "Start with your login details."
              : step === 2
                ? "Add a few details to finish your profile."
                : "Сохраните коды восстановления перед входом в приложение."}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <span
            className={`h-1 flex-1 rounded-full tepla-interactive ${step >= 1 ? "bg-tepla-accent" : "bg-tepla-bg-tertiary"}`}
          />
          <span
            className={`h-1 flex-1 rounded-full tepla-interactive ${step >= 2 ? "bg-tepla-accent" : "bg-tepla-bg-tertiary"}`}
          />
          <span
            className={`h-1 flex-1 rounded-full tepla-interactive ${step >= 3 ? "bg-tepla-accent" : "bg-tepla-bg-tertiary"}`}
          />
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {step === 3 && binaryShield ? (
            <BinaryShieldStep
              key="step-3"
              shield={binaryShield}
              onContinue={finishRegistration}
            />
          ) : step === 1 ? (
            <motion.div key="step-1" {...pageTransition} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-tepla-text-secondary">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                {errors.email ? (
                  <p className="text-xs text-tepla-danger">{errors.email}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-tepla-text-secondary"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  rightIcon={
                    showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )
                  }
                  onRightIconClick={() => setShowPassword((value) => !value)}
                />
                {errors.password ? (
                  <p className="text-xs text-tepla-danger">{errors.password}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-medium text-tepla-text-secondary"
                >
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="your_handle"
                />
                <p className="text-[11px] text-tepla-text-muted">
                  @{normalizedUsername || "your_handle"}
                </p>
                {errors.username ? (
                  <p className="text-xs text-tepla-danger">{errors.username}</p>
                ) : null}
              </div>

              <Button type="button" className="w-full gap-2" onClick={goToStep2}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : step === 2 ? (
            <motion.form
              key="step-2"
              {...pageTransition}
              onSubmit={(event) => {
                void handleRegister(event);
              }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-tepla-border bg-tepla-bg-tertiary tepla-interactive hover:border-tepla-accent"
                >
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-tepla-text-muted">
                      <User className="h-10 w-10" />
                    </span>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Upload avatar
                </Button>
                {errors.avatar ? (
                  <p className="text-xs text-tepla-danger">{errors.avatar}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="bio" className="text-xs font-medium text-tepla-text-secondary">
                    Bio
                  </label>
                  <span className="text-[11px] text-tepla-text-muted">
                    {bio.length}/{BIO_MAX}
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={bio}
                  maxLength={BIO_MAX}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="A short intro about you"
                  rows={3}
                />
                {errors.bio ? (
                  <p className="text-xs text-tepla-danger">{errors.bio}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="birthDate"
                  className="text-xs font-medium text-tepla-text-secondary"
                >
                  Date of birth
                </label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </div>

              {globalError ? (
                <p className="text-xs text-tepla-danger">{globalError}</p>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-[1.4]" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
