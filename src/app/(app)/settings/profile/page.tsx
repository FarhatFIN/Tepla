"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth.store";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { VoiceRecorder, type VoiceRecording } from "@/components/chat/VoiceRecorder";

const normalizeUsername = (value: string) =>
  value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

const usernameColors = ["#2AABEE", "#7C3AED", "#F97316", "#10B981", "#F43F5E"];

const uploadAvatar = async (file: File, userId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "avatar");
  formData.append("userId", userId);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to upload avatar.");
  }

  return (await response.json()) as {
    url: string;
  };
};

const uploadVoiceStatus = async (recording: VoiceRecording, userId: string) => {
  const file = new File([recording.blob], recording.fileName, {
    type: recording.mimeType,
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "voice-status");
  formData.append("userId", userId);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to upload voice status.");
  }

  return (await response.json()) as {
    url: string;
  };
};

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [language, setLanguage] = useState(user?.language ?? DEFAULT_LANGUAGE);
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji ?? "");
  const [usernameColor, setUsernameColor] = useState(user?.usernameColor ?? "#2AABEE");
  const [animatedAvatarEnabled, setAnimatedAvatarEnabled] = useState(
    user?.animatedAvatarEnabled ?? false,
  );
  const [voiceStatusUrl, setVoiceStatusUrl] = useState(user?.voiceStatusUrl ?? "");
  const [voiceStatusDurationSeconds, setVoiceStatusDurationSeconds] = useState<number | null>(
    user?.voiceStatusDurationSeconds ?? null,
  );
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setUploadingAvatar] = useState(false);
  const [isUploadingVoiceStatus, setUploadingVoiceStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setDisplayName(user?.displayName ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setLanguage(user?.language ?? DEFAULT_LANGUAGE);
    setBirthDate(user?.birthDate ?? "");
    setStatusEmoji(user?.statusEmoji ?? "");
    setUsernameColor(user?.usernameColor ?? "#2AABEE");
    setAnimatedAvatarEnabled(user?.animatedAvatarEnabled ?? false);
    setVoiceStatusUrl(user?.voiceStatusUrl ?? "");
    setVoiceStatusDurationSeconds(user?.voiceStatusDurationSeconds ?? null);
  }, [
    user?.animatedAvatarEnabled,
    user?.avatarUrl,
    user?.birthDate,
    user?.displayName,
    user?.language,
    user?.statusEmoji,
    user?.username,
    user?.usernameColor,
    user?.voiceStatusDurationSeconds,
    user?.voiceStatusUrl,
  ]);

  const normalizedUsername = normalizeUsername(username);
  const usernameValid = /^[a-z0-9_]{4,}$/.test(normalizedUsername);

  const handleSave = async () => {
    if (!user) {
      setError("Sign in to edit your profile.");
      return;
    }

    if (!usernameValid) {
      setError("Username must be at least 4 characters and use only letters, numbers, or _.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          displayName: displayName.trim() || null,
          avatarUrl: avatarUrl || null,
          bio: bio.trim() || null,
          language,
          birthDate: birthDate || null,
          statusEmoji: statusEmoji || null,
          usernameColor,
          avatarAnimationEnabled: animatedAvatarEnabled,
          voiceStatusUrl: voiceStatusUrl || null,
          voiceStatusDurationSeconds,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to save profile.");
      }

      const payload = (await response.json()) as {
        profile: {
          username: string;
          displayName: string | null;
          avatarUrl: string | null;
          bio: string | null;
          language: string;
          birthDate: string | null;
          statusEmoji: string | null;
          usernameColor: string | null;
          animatedAvatarEnabled: boolean;
          voiceStatusUrl: string | null;
          voiceStatusDurationSeconds: number | null;
        };
      };

      updateUser({
        username: payload.profile.username,
        displayName: payload.profile.displayName,
        avatarUrl: payload.profile.avatarUrl,
        language: payload.profile.language,
        birthDate: payload.profile.birthDate,
        statusEmoji: payload.profile.statusEmoji,
        usernameColor: payload.profile.usernameColor,
        animatedAvatarEnabled: payload.profile.animatedAvatarEnabled,
        voiceStatusUrl: payload.profile.voiceStatusUrl,
        voiceStatusDurationSeconds: payload.profile.voiceStatusDurationSeconds,
      });
      setBio(payload.profile.bio ?? "");
      setSuccess("Profile updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!user) {
      setError("Sign in to change your avatar.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for your avatar.");
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    try {
      const upload = await uploadAvatar(file, user.id);
      setAvatarUrl(upload.url);
      setSuccess("Avatar uploaded. Save your profile to apply it.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleVoiceStatus = async (recording: VoiceRecording) => {
    if (!user) {
      throw new Error("Sign in to set a voice status.");
    }

    setUploadingVoiceStatus(true);
    setError(null);

    try {
      const upload = await uploadVoiceStatus(recording, user.id);
      setVoiceStatusUrl(upload.url);
      setVoiceStatusDurationSeconds(recording.durationSeconds);
      setSuccess("Voice status uploaded. Save your profile to publish it.");
    } finally {
      setUploadingVoiceStatus(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-2xl p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <Avatar
                size="lg"
                animated={Boolean(animatedAvatarEnabled)}
                alt={displayName || normalizedUsername || "Tepla User"}
                src={avatarUrl || undefined}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleAvatarChange(event);
                }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="subtle"
                  size="sm"
                  disabled={!user || isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {avatarUrl ? "Change avatar" : "Upload avatar"}
                </Button>
                {avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploadingAvatar}
                    onClick={() => {
                      setAvatarUrl("");
                      setSuccess("Avatar removed. Save your profile to apply it.");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-center text-[11px] text-tepla-text-muted">
                Upload JPG, PNG, WebP, or GIF. Animation works best with GIF avatars.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@handle"
            />
            <p
              className="text-[11px]"
              style={{ color: usernameColor }}
            >
              Public search handle: @{normalizedUsername || "your_handle"}
              {statusEmoji ? ` ${statusEmoji}` : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Display name</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Bio</label>
            <Input
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell us about yourself"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-tepla-text-muted">Birth date</label>
              <Input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-tepla-text-muted">Status emoji</label>
              <Input
                value={statusEmoji}
                onChange={(event) => setStatusEmoji(event.target.value)}
                placeholder="✨"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Interface language</label>
            <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Identity customization</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-tepla-text-muted">Username color</label>
                <div className="flex flex-wrap gap-2">
                  {usernameColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: usernameColor === color ? "white" : "transparent",
                      }}
                      onClick={() => setUsernameColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-tepla-text-muted">Animated avatar</label>
                <Button
                  type="button"
                  variant={animatedAvatarEnabled ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setAnimatedAvatarEnabled((current) => !current)}
                >
                  {animatedAvatarEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Voice status</p>
            <p className="mt-1 text-xs text-tepla-text-muted">
              Publish a short voice status on your profile.
            </p>
            <div className="mt-3">
              <VoiceRecorder
                disabled={!user || isUploadingVoiceStatus}
                highQuality
                onSend={handleVoiceStatus}
              />
            </div>
            {voiceStatusUrl ? (
              <audio controls src={voiceStatusUrl} className="mt-3 w-full" />
            ) : null}
            {voiceStatusDurationSeconds ? (
              <p className="mt-2 text-xs text-tepla-text-muted">
                Voice status length: {voiceStatusDurationSeconds}s
              </p>
            ) : null}
          </div>

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-300">{success}</p> : null}

          <Button
            className="w-full"
            disabled={isSaving || !usernameValid || !user}
            onClick={() => {
              void handleSave();
            }}
          >
            Save
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
