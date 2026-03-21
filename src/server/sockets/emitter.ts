import type { Server as IOServer } from "socket.io";
import type {
  ClientToServerSocketEvents,
  ServerToClientSocketEvents,
} from "./events";

let socketServer:
  | IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents>
  | null = null;

export const setSocketServer = (
  io: IOServer<ClientToServerSocketEvents, ServerToClientSocketEvents>,
) => {
  socketServer = io;
};

export const getSocketServer = () => socketServer;

export const emitToChat = <TEvent extends keyof ServerToClientSocketEvents>(
  chatId: string,
  event: TEvent,
  payload: Parameters<ServerToClientSocketEvents[TEvent]>[0],
) => {
  if (!socketServer) {
    return;
  }

  const roomEmitter = socketServer.to(chatId) as unknown as {
    emit: (
      eventName: TEvent,
      eventPayload: Parameters<ServerToClientSocketEvents[TEvent]>[0],
    ) => void;
  };

  roomEmitter.emit(event, payload);
};

export const emitToUser = <TEvent extends keyof ServerToClientSocketEvents>(
  userId: string,
  event: TEvent,
  payload: Parameters<ServerToClientSocketEvents[TEvent]>[0],
) => {
  if (!socketServer) {
    return;
  }

  const roomName = `user:${userId}`;
  const roomEmitter = socketServer.to(roomName) as unknown as {
    emit: (
      eventName: TEvent,
      eventPayload: Parameters<ServerToClientSocketEvents[TEvent]>[0],
    ) => void;
  };

  roomEmitter.emit(event, payload);
};
