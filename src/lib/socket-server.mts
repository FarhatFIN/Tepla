import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { setSocketServer } from "../server/sockets/emitter.ts";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "../server/sockets/events.ts";
import { validateToken } from "../server/auth/require-auth.ts";

let io:
  | IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents>
  | null = null;

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
  });

  // Auth middleware — validate token before any event is processed
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const userId = await validateToken(token);
    if (!userId) {
      return next(new Error("Invalid or expired session"));
    }
    (socket as unknown as { userId: string }).userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    setSocketServer(io!);

    const authenticatedUserId = (socket as unknown as { userId: string }).userId;

    socket.on("presence:join", (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit("presence:joined", { userId: authenticatedUserId });
    });

    socket.on("presence:leave", (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit("presence:left", { userId: authenticatedUserId });
    });

    socket.on("typing", (payload: { chatId: string; userId: string }) => {
      // Use the authenticated userId, not the client-supplied one
      socket.to(payload.chatId).emit("typing", {
        chatId: payload.chatId,
        userId: authenticatedUserId,
      });
    });
  });

  setSocketServer(io);
  return io;
};
