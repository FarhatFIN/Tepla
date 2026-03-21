import type { ChatId } from "./chat";
import type { UserId } from "./user";

export type CallId = string;

export type CallType = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined";

export type TeplaCall = {
  id: CallId;
  chatId: ChatId | null;
  initiatorId: UserId;
  type: CallType;
  status: CallStatus;
  livekitRoomName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

