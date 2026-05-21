"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";
import { Smartphone, Trash2 } from "lucide-react";

export default function PrivacySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      setPasswordMessage("Fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }
    setPasswordMessage("Password change will be available in a future update.");
  };

  return (
    <SettingsSubpageShell title="Privacy & Security">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-tepla-text">Change password</h3>
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
            {passwordMessage ? (
              <p className="text-xs text-tepla-text-muted">{passwordMessage}</p>
            ) : null}
            <Button className="w-full" onClick={handlePasswordChange}>
              Update password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-tepla-text">Active sessions</h3>
            <div className="flex items-start gap-3 rounded-xl border border-tepla-border/70 bg-tepla-bg-tertiary/50 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tepla-accent/15 text-tepla-accent">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-tepla-text">This device</p>
                <p className="text-xs text-tepla-text-muted">Current session · Active now</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Log out other sessions
            </Button>
          </CardContent>
        </Card>

        <Card className="border-tepla-danger/30">
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-tepla-danger">Delete account</h3>
            <p className="text-xs leading-relaxed text-tepla-text-muted">
              Permanently delete your account and all associated data. This action cannot be
              undone.
            </p>
            <Button variant="danger" className="w-full gap-2">
              <Trash2 className="h-4 w-4" />
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </SettingsSubpageShell>
  );
}
