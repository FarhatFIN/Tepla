import { create } from "zustand";

export type CallState = "idle" | "ringing" | "incoming" | "active";

export type IncomingCall = {
  callId: string;
  chatId: string;
  initiatorId: string;
  initiatorName: string;
  callType: "audio" | "video";
};

export type ActiveCall = {
  callId: string;
  chatId: string;
  callType: "audio" | "video";
  token: string | null;
  livekitUrl: string | null;
  startedAt: string;
  isMuted: boolean;
  isVideoOn: boolean;
};

export interface CallStore {
  state: CallState;
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  setIncomingCall: (call: IncomingCall) => void;
  acceptCall: (token: string | null, livekitUrl: string | null) => void;
  startCall: (payload: {
    callId: string;
    chatId: string;
    callType: "audio" | "video";
    token: string | null;
    livekitUrl: string | null;
  }) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  declineCall: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  state: "idle",
  incomingCall: null,
  activeCall: null,

  setIncomingCall: (call) =>
    set({ state: "incoming", incomingCall: call }),

  acceptCall: (token, livekitUrl) => {
    const incoming = get().incomingCall;
    if (!incoming) return;
    set({
      state: "active",
      incomingCall: null,
      activeCall: {
        callId: incoming.callId,
        chatId: incoming.chatId,
        callType: incoming.callType,
        token,
        livekitUrl,
        startedAt: new Date().toISOString(),
        isMuted: false,
        isVideoOn: incoming.callType === "video",
      },
    });
  },

  startCall: (payload) =>
    set({
      state: "active",
      incomingCall: null,
      activeCall: {
        ...payload,
        startedAt: new Date().toISOString(),
        isMuted: false,
        isVideoOn: payload.callType === "video",
      },
    }),

  endCall: () =>
    set({ state: "idle", incomingCall: null, activeCall: null }),

  toggleMute: () =>
    set((s) => ({
      activeCall: s.activeCall
        ? { ...s.activeCall, isMuted: !s.activeCall.isMuted }
        : null,
    })),

  toggleVideo: () =>
    set((s) => ({
      activeCall: s.activeCall
        ? { ...s.activeCall, isVideoOn: !s.activeCall.isVideoOn }
        : null,
    })),

  declineCall: () =>
    set({ state: "idle", incomingCall: null }),
}));
