import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3100";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
  // Room re-join and state re-sync on reconnect are handled by
  // useChatStore.bindSocket() to avoid a circular import here.
  socket.on("connect", () => {
    console.log("[ws] connected");
  });
  socket.on("disconnect", (reason) => console.log("[ws] disconnected:", reason));

  // Listen for real-time user profile updates (username changes, etc.)
  socket.on("user:updated", (payload: { userId: string; fields: string[] }) => {
    console.log("[ws] user:updated", payload);
  });
  socket.on("user:profile_changed", (payload: { userId: string; fields: string[] }) => {
    console.log("[ws] user:profile_changed", payload);
  });

  return socket;
}

export function getSocket(): Socket | null { return socket; }

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
