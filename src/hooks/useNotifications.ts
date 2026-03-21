"use client";

import { useEffect, useState } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
} from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth.store";

export const useNotifications = () => {
  const { user } = useAuthStore();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    void (async () => {
      if (permission === "granted") {
        await subscribeToPush({
          userId: user.id,
          vapidPublicKey: vapidKey,
        });
        setIsSubscribed(true);
      }
    })();
  }, [user, permission]);

  const enableNotifications = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
  };

  return {
    permission,
    isSubscribed,
    enableNotifications,
  };
};

