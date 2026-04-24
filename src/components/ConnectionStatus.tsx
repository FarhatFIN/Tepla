"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { isSocketConnected, onConnectionChange } from "@/lib/socket";

type ConnectionState = "online" | "offline" | "reconnecting";

export const ConnectionStatus = () => {
  const [state, setState] = useState<ConnectionState>("online");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Track browser online/offline
    const handleOnline = () => {
      setState("reconnecting");
      // Give socket a moment to reconnect
      setTimeout(() => {
        if (isSocketConnected()) {
          setState("online");
        }
      }, 2000);
    };

    const handleOffline = () => setState("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setState("offline");
    }

    // Track socket connection state
    const unsubscribe = onConnectionChange((connected) => {
      if (connected) {
        setState("online");
      } else if (navigator.onLine) {
        setState("reconnecting");
      } else {
        setState("offline");
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  // Show/hide with delay for smooth transitions
  useEffect(() => {
    if (state === "online") {
      // Show "back online" briefly, then hide
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }

    setVisible(true);
  }, [state]);

  if (!visible) return null;

  const config = {
    online: {
      icon: <Wifi className="h-3.5 w-3.5" />,
      label: "Back online",
      className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    },
    offline: {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: "No connection — messages will be sent when you reconnect",
      className: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    },
    reconnecting: {
      icon: <Wifi className="h-3.5 w-3.5 animate-pulse" />,
      label: "Reconnecting...",
      className: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    },
  }[state];

  return (
    <div className={`mx-3 mb-2 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-all ${config.className}`}>
      {config.icon}
      {config.label}
    </div>
  );
};
