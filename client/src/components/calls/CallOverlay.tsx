"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/hooks/useTranslation";

const AGORA_APP_ID = "fe668b6a178645fbaa767f3e7dbc9f3d";

interface AgoraClient {
  join: (appId: string, channel: string, token: string | null, uid: string | number) => Promise<any>;
  leave: () => Promise<void>;
  publish: (tracks: any[]) => Promise<void>;
  unpublish: (tracks: any[]) => Promise<void>;
  on: (event: string, cb: (...args: any[]) => void) => void;
  remoteUsers: any[];
}

export default function CallOverlay() {
  const { showCalls, toggleCalls, chats, activeChatId } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const t = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [callState, setCallState] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<{ uid: string | number; name?: string; avatar?: string; hasVideo: boolean; hasAudio: boolean }[]>([]);

  const clientRef = useRef<AgoraClient | null>(null);
  const localAudioRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const localScreenRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement>(null);

  const chat = chats.find((c) => c.id === activeChatId);
  const channelName = activeChatId ? `tepla-${activeChatId.slice(0, 8)}` : "";

  const cleanup = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (localAudioRef.current) { localAudioRef.current.close(); localAudioRef.current = null; }
      if (localVideoRef.current) { localVideoRef.current.close(); localVideoRef.current = null; }
      if (localScreenRef.current) { localScreenRef.current.close(); localScreenRef.current = null; }
      if (clientRef.current) { await clientRef.current.leave(); clientRef.current = null; }
    } catch { /* ignore cleanup errors */ }
  }, []);

  // Start call when overlay opens
  useEffect(() => {
    if (!showCalls || !chat || !activeChatId) return;

    let cancelled = false;

    async function startCall() {
      try {
        // Dynamic import of Agora SDK
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }) as unknown as AgoraClient;
        clientRef.current = client;

        // Handle remote user events
        client.on("user-published", async (remoteUser: any, mediaType: string) => {
          await (client as any).subscribe(remoteUser, mediaType);
          setParticipants((prev) => {
            const existing = prev.find((p) => p.uid === remoteUser.uid);
            if (existing) {
              return prev.map((p) => p.uid === remoteUser.uid ? { ...p, hasVideo: mediaType === "video" || p.hasVideo, hasAudio: mediaType === "audio" || p.hasAudio } : p);
            }
            return [...prev, { uid: remoteUser.uid, hasVideo: mediaType === "video", hasAudio: mediaType === "audio" }];
          });
          // Play remote video
          if (mediaType === "video") {
            const el = document.getElementById(`remote-video-${remoteUser.uid}`);
            if (el) remoteUser.videoTrack?.play(el);
          }
          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
          }
        });

        client.on("user-unpublished", (remoteUser: any, mediaType: string) => {
          setParticipants((prev) =>
            prev.map((p) => p.uid === remoteUser.uid ? { ...p, hasVideo: mediaType === "video" ? false : p.hasVideo, hasAudio: mediaType === "audio" ? false : p.hasAudio } : p)
          );
        });

        client.on("user-left", (remoteUser: any) => {
          setParticipants((prev) => prev.filter((p) => p.uid !== remoteUser.uid));
        });

        // Join channel
        setCallState("ringing");
        const uid = user?.id?.slice(0, 8) || String(Math.floor(Math.random() * 100000));
        await client.join(AGORA_APP_ID, channelName, null, uid);

        if (cancelled) { await client.leave(); return; }

        // Create and publish audio track
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioRef.current = audioTrack;
        await client.publish([audioTrack]);

        setCallState("active");

        // Start timer
        timerRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);

      } catch (err) {
        console.warn("[call] Failed to start:", err);
        setCallState("ended");
      }
    }

    startCall();
    return () => { cancelled = true; cleanup(); };
  }, [showCalls, activeChatId]);

  // Toggle mute
  const toggleMute = async () => {
    if (localAudioRef.current) {
      await localAudioRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (isVideoOn) {
        if (localVideoRef.current && clientRef.current) {
          await clientRef.current.unpublish([localVideoRef.current]);
          localVideoRef.current.close();
          localVideoRef.current = null;
        }
        setIsVideoOn(false);
      } else {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        if (clientRef.current) {
          await clientRef.current.publish([videoTrack]);
        }
        if (localVideoContainerRef.current) {
          videoTrack.play(localVideoContainerRef.current);
        }
        setIsVideoOn(true);
        setCallType("video");
      }
    } catch (err) {
      console.warn("[call] Video toggle failed:", err);
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (localScreenRef.current && clientRef.current) {
          await clientRef.current.unpublish([localScreenRef.current]);
          localScreenRef.current.close();
          localScreenRef.current = null;
        }
        setIsScreenSharing(false);
      } else {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
        localScreenRef.current = track;
        if (clientRef.current) {
          // Unpublish camera if active
          if (localVideoRef.current) {
            await clientRef.current.unpublish([localVideoRef.current]);
            localVideoRef.current.close();
            localVideoRef.current = null;
            setIsVideoOn(false);
          }
          await clientRef.current.publish([track]);
        }
        (track as any).on?.("track-ended", () => {
          toggleScreenShare();
        });
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn("[call] Screen share failed:", err);
    }
  };

  // End call
  const endCall = async () => {
    setCallState("ended");
    await cleanup();
    setCallDuration(0);
    setParticipants([]);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    toggleCalls();
  };

  if (!showCalls || !chat) return null;

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const isGroupCall = chat.type === "group" || chat.type === "channel";
  const totalParticipants = participants.length + 1; // +1 for self

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background: "radial-gradient(ellipse at center, rgba(108,61,232,0.15) 0%, rgba(10,6,18,0.95) 70%)" }}>
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 rounded-3xl p-6 shadow-2xl animate-scale-in glass" style={{ background: "rgba(19,13,36,0.92)", border: "1px solid rgba(108,61,232,0.25)" }}>
        {/* Header */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${callState === "active" ? "bg-[#00D46A] animate-pulse" : callState === "ringing" ? "bg-[#8B5CF6] animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              {callState === "connecting" ? t("connecting") : callState === "ringing" ? t("ringing") : callState === "active" ? formatDuration(callDuration) : t("call_ended")}
            </span>
          </div>
          {isGroupCall && (
            <span className="text-xs text-[var(--text-tertiary)]">{t("participants_count", { count: totalParticipants })}</span>
          )}
        </div>

        {/* Video area or avatar */}
        {(isVideoOn || isScreenSharing || participants.some((p) => p.hasVideo)) ? (
          <div className="grid gap-2 w-full" style={{ gridTemplateColumns: `repeat(${Math.min(totalParticipants, 3)}, 1fr)` }}>
            {/* Local video */}
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
              <div ref={localVideoContainerRef} className="absolute inset-0" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1">
                <span className="text-[10px] text-white">{t("you")}</span>
                {isMuted && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>}
              </div>
            </div>
            {/* Remote videos */}
            {participants.filter((p) => p.hasVideo).map((p) => (
              <div key={String(p.uid)} className="relative aspect-video rounded-xl bg-black overflow-hidden">
                <div id={`remote-video-${p.uid}`} className="absolute inset-0" />
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1">
                  <span className="text-[10px] text-white">{p.name || String(p.uid).slice(0, 6)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            {isGroupCall ? (
              <div className="flex -space-x-3">
                <Avatar name={chat.name} src={chat.avatar} size="xl" showStatus={false} />
                {participants.slice(0, 3).map((p) => (
                  <div key={String(p.uid)} className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white ring-2 ring-[var(--bg-card)]">
                    {(p.name || String(p.uid))[0].toUpperCase()}
                  </div>
                ))}
              </div>
            ) : (
              <Avatar name={chat.name} src={chat.avatar} size="xl" showStatus={false} />
            )}
            <div className="text-center">
              <h2 className="text-xl font-semibold">{chat.name}</h2>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                {callType === "video" ? t("video_call") : t("voice_call")}
              </p>
            </div>
          </div>
        )}

        {/* Participant list for group calls */}
        {isGroupCall && participants.length > 0 && (
          <div className="flex w-full flex-wrap gap-2 rounded-xl bg-[var(--bg-input)] p-3">
            {participants.map((p) => (
              <div key={String(p.uid)} className="flex items-center gap-2 rounded-lg bg-[var(--bg-main)] px-2.5 py-1.5">
                <div className={`h-2 w-2 rounded-full ${p.hasAudio ? "bg-[#00D46A]" : "bg-red-400"}`} />
                <span className="text-xs">{p.name || String(p.uid).slice(0, 6)}</span>
                {p.hasVideo && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isMuted ? "bg-red-500/20 text-red-400" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`} title={isMuted ? t("unmute") : t("mute")}>
            {isMuted
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
          </button>

          <button onClick={toggleVideo} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isVideoOn ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`} title={isVideoOn ? t("turn_off_camera") : t("turn_on_camera")}>
            {isVideoOn
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 7l-5 3.5V7a2 2 0 0 0-2-2H5"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
          </button>

          <button onClick={toggleScreenShare} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isScreenSharing ? "bg-[#6C3DE8] text-white" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`} title={isScreenSharing ? t("stop_sharing") : t("share_screen")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>

          <button onClick={endCall} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors" title={t("end_call")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
