"use client";

import { MessageSquare, Users, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SettingsSubpageShell } from "@/components/settings/SettingsSubpageShell";
import { useUIStore } from "@/stores/ui.store";

function NotificationRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof MessageSquare;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tepla-accent/15 text-tepla-accent">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-tepla-text">{label}</p>
          <p className="text-xs text-tepla-text-muted">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const notifyMessages = useUIStore((s) => s.notifyMessages);
  const notifyGroups = useUIStore((s) => s.notifyGroups);
  const notifySound = useUIStore((s) => s.notifySound);
  const setNotifyMessages = useUIStore((s) => s.setNotifyMessages);
  const setNotifyGroups = useUIStore((s) => s.setNotifyGroups);
  const setNotifySound = useUIStore((s) => s.setNotifySound);

  return (
    <SettingsSubpageShell title="Notifications">
      <Card>
        <CardContent className="divide-y divide-tepla-border/60 space-y-0 pt-2">
          <div className="py-3">
            <NotificationRow
              icon={MessageSquare}
              label="Message notifications"
              description="Alerts for new direct messages"
              checked={notifyMessages}
              onCheckedChange={setNotifyMessages}
            />
          </div>
          <div className="py-3">
            <NotificationRow
              icon={Users}
              label="Group notifications"
              description="Alerts for group activity"
              checked={notifyGroups}
              onCheckedChange={setNotifyGroups}
            />
          </div>
          <div className="py-3">
            <NotificationRow
              icon={Volume2}
              label="Sound"
              description="Play sound for new messages"
              checked={notifySound}
              onCheckedChange={setNotifySound}
            />
          </div>
        </CardContent>
      </Card>
    </SettingsSubpageShell>
  );
}
