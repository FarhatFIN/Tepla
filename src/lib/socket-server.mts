import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { setSocketServer } from "../server/sockets/emitter.ts";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "../server/sockets/events.ts";

let io:
  | IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents>
  | null = null;

// Track userId → socketId mapping for presence
const userSockets = new Map<string, Set<string>>();

export const initSocketServer = (
  server: HTTPServer,
): IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents> => {
  if (io) return io;

  io = new IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents>(server, {
    path: "/api/socket/io",
    transports: ["websocket"],
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
      credentials: true,
    },
    pingInterval: 15000,
    pingTimeout: 10000,
  });

  io.on("connection", (socket) => {
    setSocketServer(io!);

    // ─── Presence ─────────────────────────────
    socket.on("presence:join", (roomId: string) => {
      socket.join(roomId);

      // Track user presence if this is a user room (user:xxx)
      if (roomId.startsWith("user:")) {
        const userId = roomId.replace("user:", "");
        const sockets = userSockets.get(userId) ?? new Set();
        sockets.add(socket.id);
        userSockets.set(userId, sockets);

        // Broadcast online status to all connected clients
        socket.broadcast.emit("presence:online", { userId, lastSeen: null });
      }

      socket.to(roomId).emit("presence:joined", { userId: socket.id });
    });

    socket.on("presence:leave", (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit("presence:left", { userId: socket.id });
    });

    socket.on("disconnect", () => {
      // Clean up user presence tracking
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            // Broadcast offline with timestamp
            socket.broadcast.emit("presence:offline", {
              userId,
              lastSeen: new Date().toISOString(),
            });
          }
        }
      }
    });

    // ─── Typing ───────────────────────────────
    socket.on("typing", (payload: { chatId: string; userId: string }) => {
      socket.to(payload.chatId).emit("typing", payload);
    });

    // ─── Message ACK (delivery confirmation) ──
    socket.on("message:ack", (payload: { chatId: string; messageId: string; userId: string }) => {
      socket.to(payload.chatId).emit("message:delivered", {
        chatId: payload.chatId,
        messageId: payload.messageId,
        userId: payload.userId,
      });
    });

    // ─── Read receipts ────────────────────────
    socket.on("message:read", (payload: { chatId: string; messageIds: string[]; userId: string }) => {
      if (payload.messageIds.length === 0) return;

      // Broadcast read receipt to the chat
      socket.to(payload.chatId).emit("message:read", {
        chatId: payload.chatId,
        messageIds: payload.messageIds,
        userId: payload.userId,
      });
    });

    // ─── Calls ────────────────────────────────
    socket.on("call:start", async (payload: { chatId: string; callType: "audio" | "video" }) => {
      // Request a call token from the API
      try {
        const userId = findUserIdBySocket(socket.id);
        if (!userId) return;

        const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/api/calls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: `tepla-${payload.chatId}-${Date.now()}`,
            participantName: userId,
            callType: payload.callType,
            chatId: payload.chatId,
          }),
        });

        const data = await response.json();

        // Notify all chat members about incoming call
        socket.to(payload.chatId).emit("call:incoming", {
          callId: data.roomName ?? `call-${Date.now()}`,
          chatId: payload.chatId,
          initiatorId: userId,
          initiatorName: userId,
          callType: payload.callType,
        });
      } catch {
        // Call initiation failed silently
      }
    });

    socket.on("call:end", (payload: { callId: string }) => {
      // Broadcast call ended to all rooms this socket is in
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("call:ended", {
            callId: payload.callId,
            chatId: room,
          });
        }
      }
    });
  });

  setSocketServer(io);
  return io;
};

function findUserIdBySocket(socketId: string): string | null {
  for (const [userId, sockets] of userSockets.entries()) {
    if (sockets.has(socketId)) return userId;
  }
  return null;
}
