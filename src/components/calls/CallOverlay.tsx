"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallStore } from "@/stores/call.store";
import { getTeplaSocket } from "@/lib/socket";

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** Incoming call ring overlay */
const IncomingCallBanner = () => {
  const { incomingCall, acceptCall, declineCall } = useCallStore();

  if (!incomingCall) return null;

  const handleAccept = async () => {
    try {
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: incomingCall.callId,
          participantName: "user",
          callType: incomingCall.callType,
          chatId: incomingCall.chatId,
        }),
      });
      const data = await response.json();
      acceptCall(data.token ?? null, data.livekitUrl ?? null);
    } catch {
      acceptCall(null, null);
    }
  };

  const handleDecline = () => {
    const socket = getTeplaSocket();
    socket.emit("call:decline", { callId: incomingCall.callId });
    declineCall();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-4">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-tepla-bg/95 px-6 py-4 shadow-2xl backdrop-blur-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tepla-accent/20">
          {incomingCall.callType === "video" ? (
            <Video className="h-6 w-6 text-tepla-accent" />
          ) : (
            <Phone className="h-6 w-6 text-tepla-accent" />
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{incomingCall.initiatorName}</p>
          <p className="text-sm text-tepla-text-muted">
            Incoming {incomingCall.callType} call...
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            onClick={handleDecline}
            className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            onClick={handleAccept}
            className="h-11 w-11 rounded-full bg-emerald-500 hover:bg-emerald-600"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Active call bar */
const ActiveCallBar = () => {
  const { activeCall, endCall, toggleMute, toggleVideo } = useCallStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeCall) return;
    const start = new Date(activeCall.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  if (!activeCall) return null;

  const handleEnd = () => {
    const socket = getTeplaSocket();
    socket.emit("call:end", { callId: activeCall.callId });
    endCall();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-b-2xl border border-t-0 border-white/10 bg-emerald-500/90 px-5 py-2.5 shadow-lg backdrop-blur-sm">
        <span className="text-sm font-medium text-white">
          {activeCall.callType === "video" ? "Video" : "Voice"} call
        </span>
        <span className="font-mono text-sm text-white/80">{formatDuration(elapsed)}</span>
        <div className="flex gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="h-8 w-8 rounded-full text-white hover:bg-white/20"
          >
            {activeCall.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          {activeCall.callType === "video" ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleVideo}
              className="h-8 w-8 rounded-full text-white hover:bg-white/20"
            >
              {activeCall.isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          ) : null}
          <Button
            size="icon"
            onClick={handleEnd}
            className="h-8 w-8 rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Main call overlay — shows incoming or active call UI */
export const CallOverlay = () => {
  const callState = useCallStore((s) => s.state);

  if (callState === "incoming") return <IncomingCallBanner />;
  if (callState === "active") return <ActiveCallBar />;
  return null;
};
