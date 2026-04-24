import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "@/server/sockets/events";

type TeplaSocket = Socket<ServerToClientSocketEvents, ClientToServerSocketEvents>;

let socket: TeplaSocket | null = null;

const connectionListeners = new Set<(connected: boolean) => void>();

export const onConnectionChange = (listener: (connected: boolean) => void): (() => void) => {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
};

export const isSocketConnected = (): boolean => socket?.connected ?? false;

export const getTeplaSocket = (): TeplaSocket => {
  if (typeof window === "undefined") {
    throw new Error("Socket.io client can only be used in the browser.");
  }

  if (socket) {
    return socket;
  }

  const url =
    process.env.NEXT_PUBLIC_TEPLA_SOCKET_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  socket = io(url, {
    path: "/api/socket/io",
    transports: ["websocket"],
    autoConnect: true,
    withCredentials: true,
    // Infinite reconnect with exponential backoff (like Telegram)
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.3,
    timeout: 10000,
  });

  socket.on("connect", () => {
    for (const listener of connectionListeners) listener(true);
  });

  socket.on("disconnect", () => {
    for (const listener of connectionListeners) listener(false);
  });

  return socket;
};
