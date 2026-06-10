"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";

export default function CallOverlay() {
  const { showCalls, toggleCalls, chats, activeChatId, messages: allMessages, sendMessage, callType: requestedCallType } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const t = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [callState, setCallState] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<{ identity: string; name?: string; avatar?: string; hasVideo: boolean; hasAudio: boolean }[]>([]);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatDraft, setChatDraft] = useState("");

  const roomRef = useRef<any>(null);
  const callIdRef = useRef<string | null>(null);
  const localAudioRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const chatPanelBottomRef = useRef<HTMLDivElement>(null);

  const chat = chats.find((c) => c.id === activeChatId);
  const callMessages = activeChatId ? allMessages[activeChatId] || [] : [];

  const cleanup = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    } catch { /* ignore cleanup errors */ }
  }, []);

  // Keep the in-call chat scrolled to the latest message
  useEffect(() => {
    if (showChatPanel) chatPanelBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callMessages.length, showChatPanel]);

  // Start call when overlay opens
  useEffect(() => {
    if (!showCalls || !chat || !activeChatId) return;

    let cancelled = false;

    async function startCall() {
      try {
        setCallType(requestedCallType);

        // Join the active call in this chat, or start a new one
        const active = await api.get<{ success: boolean; data: { id: string } | null }>(`/calls/chat/${activeChatId}/active`);
        let payload: { call?: any; token?: string; livekitUrl?: string; action?: string };
        if (active.data?.id) {
          payload = (await api.post<{ success: boolean; data: any }>(`/calls/${active.data.id}/join`)).data;
        } else {
          payload = (await api.post<{ success: boolean; data: any }>("/calls/start", {
            chatId: activeChatId,
            type: requestedCallType,
            isGroup: chat?.type === "group" || chat?.type === "channel",
          })).data;
          // Race: someone started a call between our check and /start
          if (payload.action === "join_existing" && payload.call?.id) {
            payload = (await api.post<{ success: boolean; data: any }>(`/calls/${payload.call.id}/join`)).data;
          }
        }

        const token = payload.token;
        const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || payload.livekitUrl;
        callIdRef.current = payload.call?.id || null;
        if (!token || !url) {
          console.warn("[call] No LiveKit token/url received");
          setCallState("ended");
          return;
        }

        if (cancelled) return;

        // Dynamic import of LiveKit SDK
        const { Room, RoomEvent, Track } = await import("livekit-client");

        const room = new Room({
          // Voice quality: browser-level noise suppression, echo cancellation and AGC
          audioCaptureDefaults: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720, frameRate: 30 },
          },
          // Bandwidth/CPU: decode only visible layers, pause hidden videos
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        // Handle remote participant events
        room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
          setParticipants((prev) => {
            const existing = prev.find((p) => p.identity === participant.identity);
            const hasVideo = track.kind === Track.Kind.Video || (existing?.hasVideo ?? false);
            const hasAudio = track.kind === Track.Kind.Audio || (existing?.hasAudio ?? false);
            if (existing) {
              return prev.map((p) => p.identity === participant.identity ? { ...p, hasVideo, hasAudio } : p);
            }
            return [...prev, { identity: participant.identity, name: participant.name, hasVideo, hasAudio }];
          });
          if (track.kind === Track.Kind.Video) {
            const el = document.getElementById(`remote-video-${participant.identity}`);
            if (el) track.attach(el);
          }
          if (track.kind === Track.Kind.Audio) {
            const audioEl = track.attach();
            document.body.appendChild(audioEl);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
          track.detach().forEach((el: HTMLElement) => el.remove());
          setParticipants((prev) =>
            prev.map((p) => p.identity === participant.identity
              ? { ...p, hasVideo: track.kind === Track.Kind.Video ? false : p.hasVideo, hasAudio: track.kind === Track.Kind.Audio ? false : p.hasAudio }
              : p)
          );
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
          setParticipants((prev) => prev.filter((p) => p.identity !== participant.identity));
        });

        // Attach our own camera/screen preview to the local tile
        room.on(RoomEvent.LocalTrackPublished, (pub: any) => {
          if (pub.track?.kind === Track.Kind.Video && localVideoContainerRef.current) {
            const el = pub.track.attach();
            el.style.width = "100%";
            el.style.height = "100%";
            el.style.objectFit = "cover";
            localVideoContainerRef.current.replaceChildren(el);
          }
        });
        room.on(RoomEvent.LocalTrackUnpublished, (pub: any) => {
          pub.track?.detach().forEach((el: HTMLElement) => el.remove());
        });

        // Connect to room
        setCallState("ringing");
        await room.connect(url, token);

        if (cancelled) { room.disconnect(); return; }

        // Enable microphone (and camera for video calls)
        await room.localParticipant.setMicrophoneEnabled(true);
        if (requestedCallType === "video") {
          try {
            await room.localParticipant.setCameraEnabled(true);
            setIsVideoOn(true);
          } catch (err) {
            console.warn("[call] Camera permission denied:", err);
          }
        }
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
    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (roomRef.current) {
        await roomRef.current.localParticipant.setCameraEnabled(!isVideoOn);
        setIsVideoOn(!isVideoOn);
        if (!isVideoOn) setCallType("video");
      }
    } catch (err) {
      console.warn("[call] Video toggle failed:", err);
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (roomRef.current) {
        await roomRef.current.localParticipant.setScreenShareEnabled(!isScreenSharing);
        setIsScreenSharing(!isScreenSharing);
      }
    } catch (err) {
      console.warn("[call] Screen share failed:", err);
    }
  };

  // Send a chat message without leaving the call
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text || !activeChatId) return;
    sendMessage(activeChatId, text);
    setChatDraft("");
  };

  // End call
  const endCall = async () => {
    setCallState("ended");
    if (callIdRef.current) {
      api.post(`/calls/${callIdRef.current}/leave`).catch(() => { /* non-critical */ });
      callIdRef.current = null;
    }
    await cleanup();
    setCallDuration(0);
    setParticipants([]);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setShowChatPanel(false);
    setChatDraft("");
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
              <div key={p.identity} className="relative aspect-video rounded-xl bg-black overflow-hidden">
                <div id={`remote-video-${p.identity}`} className="absolute inset-0" />
                <div className="absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1">
                  <span className="text-[10px] text-white">{p.name || p.identity.slice(0, 6)}</span>
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
                  <div key={p.identity} className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white ring-2 ring-[var(--bg-card)]">
                    {(p.name || p.identity)[0].toUpperCase()}
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
              <div key={p.identity} className="flex items-center gap-2 rounded-lg bg-[var(--bg-main)] px-2.5 py-1.5">
                <div className={`h-2 w-2 rounded-full ${p.hasAudio ? "bg-[#00D46A]" : "bg-red-400"}`} />
                <span className="text-xs">{p.name || p.identity.slice(0, 6)}</span>
                {p.hasVideo && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
              </div>
            ))}
          </div>
        )}

        {/* In-call chat */}
        {showChatPanel && activeChatId && (
          <div className="flex w-full flex-col gap-2 rounded-xl bg-[var(--bg-input)] p-3">
            <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {callMessages.length === 0 && (
                <p className="text-center text-[11px] text-[var(--text-tertiary)]">No messages yet</p>
              )}
              {callMessages.slice(-30).map((m) => (
                <div key={m.id} className="text-xs leading-relaxed">
                  <span className="font-semibold text-[var(--accent)]">
                    {m.senderId === user?.id ? t("you") : m.senderName || m.senderId.slice(0, 6)}
                  </span>{" "}
                  <span className="text-[var(--text-primary)] break-words">{m.text}</span>
                </div>
              ))}
              <div ref={chatPanelBottomRef} />
            </div>
            <form onSubmit={sendChatMessage} className="flex gap-2">
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Message..."
                className="flex-1 rounded-lg bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white disabled:opacity-50" disabled={!chatDraft.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
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

          <button onClick={() => setShowChatPanel((v) => !v)} className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${showChatPanel ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`} title="Chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>

          <button onClick={endCall} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors" title={t("end_call")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
