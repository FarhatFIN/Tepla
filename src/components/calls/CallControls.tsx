"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

export type CallControlsProps = {
  isMuted: boolean;
  isVideoOff: boolean;
  canToggleVideo?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
};

export const CallControls = ({
  isMuted,
  isVideoOff,
  canToggleVideo = true,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-tepla-border/80 bg-black/60 p-3">
      <Button
        size="icon"
        variant={isMuted ? "danger" : "subtle"}
        onClick={onToggleMute}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      {canToggleVideo ? (
        <Button
          size="icon"
          variant={isVideoOff ? "danger" : "subtle"}
          onClick={onToggleVideo}
        >
          {isVideoOff ? (
            <VideoOff className="h-5 w-5" />
          ) : (
            <Video className="h-5 w-5" />
          )}
        </Button>
      ) : null}
      <Button size="icon" variant="danger" onClick={onEndCall}>
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
};
