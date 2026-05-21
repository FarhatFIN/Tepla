"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";
import { useAuthStore } from "@/stores/auth.store";

const BIO_MAX = 150;

const normalizeUsername = (value: string) =>
  value
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

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

  return (await response.json()) as { url: string };
};

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState("");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setBirthDate(user?.birthDate ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.avatarUrl, user?.birthDate, user?.displayName, user?.username]);

  const normalizedUsername = normalizeUsername(username);
  const usernameValid = /^[a-z0-9_]{4,}$/.test(normalizedUsername);
  const previewSrc = avatarPreview ?? avatarUrl ?? undefined;

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    setError(null);
    try {
      const upload = await uploadAvatar(file, user.id);
      setAvatarUrl(upload.url);
      setSuccess("Avatar uploaded. Save to apply.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError("Sign in to edit your profile.");
      return;
    }
    if (!usernameValid) {
      setError("Username must be at least 4 characters (letters, numbers, _).");
      return;
    }
    if (bio.length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or less.`);
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
          birthDate: birthDate || null,
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
          birthDate: string | null;
        };
      };

      updateUser({
        username: payload.profile.username,
        displayName: payload.profile.displayName,
        avatarUrl: payload.profile.avatarUrl,
        birthDate: payload.profile.birthDate,
      });
      setBio(payload.profile.bio ?? "");
      setSuccess("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSubpageShell title="Profile">
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="rounded-full tepla-interactive"
              disabled={!user || isUploadingAvatar}
            >
              <Avatar
                size="lg"
                src={previewSrc}
                alt={displayName || normalizedUsername || "Profile"}
              />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleAvatarChange(event);
              }}
            />
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
              Change avatar
            </Button>
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
            <label className="text-xs text-tepla-text-muted">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="handle"
            />
            <p className="text-[11px] text-tepla-text-muted">@{normalizedUsername || "handle"}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-tepla-text-muted">Bio</label>
              <span className="text-[11px] text-tepla-text-muted">
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <Textarea
              value={bio}
              maxLength={BIO_MAX}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell people about yourself"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Date of birth</label>
            <Input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}
          {success ? <p className="text-xs text-tepla-online">{success}</p> : null}

          <Button
            className="w-full"
            disabled={isSaving || !usernameValid || !user}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
