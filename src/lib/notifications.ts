export type NotificationPermissionState = "default" | "granted" | "denied";

export const getNotificationPermission = (): NotificationPermissionState => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
};

export const requestNotificationPermission =
  async (): Promise<NotificationPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    const permission = await Notification.requestPermission();
    return permission;
  };

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration;
};

export const subscribeToPush = async (params: {
  userId: string;
  vapidPublicKey: string;
}): Promise<void> => {
  const registration = await registerServiceWorker();
  if (!registration || !("pushManager" in registration)) {
    return;
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return;
  }

  const convertedKey: Uint8Array = urlBase64ToUint8Array(params.vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast required due to differing lib dom typings for PushSubscriptionOptions
    applicationServerKey: convertedKey as unknown as ArrayBuffer,
  });

  await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: params.userId,
      subscription,
    }),
  });
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = typeof window === "undefined"
    ? Buffer.from(base64, "base64").toString("binary")
    : window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

