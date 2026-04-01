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

  io.on("connection", (socket) => {
    setSocketServer(io!);

    socket.on("presence:join", (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit("presence:joined", { userId: socket.id });
    });

    socket.on("presence:leave", (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit("presence:left", { userId: socket.id });
    });

    socket.on("typing", (payload: { chatId: string; userId: string }) => {
      socket.to(payload.chatId).emit("typing", payload);
    });

    socket.on("message:ack", (payload: { chatId: string; messageId: string; userId: string }) => {
      // Notify sender that the message was delivered to a recipient
      socket.to(payload.chatId).emit("message:delivered" as any, {
        chatId: payload.chatId,
        messageId: payload.messageId,
        userId: payload.userId,
      });
    });
  });

  setSocketServer(io);
  return io;
};

