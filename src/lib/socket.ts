import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "@/server/sockets/events";

type TeplaSocket = Socket<ServerToClientSocketEvents, ClientToServerSocketEvents>;

let socket: TeplaSocket | null = null;

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
    reconnectionAttempts: 5,
  });

  return socket;
};
