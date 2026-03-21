"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  CirclePlay,
  Loader2,
  Mic,
  Phone,
  Sparkles,
  UploadCloud,
  Video,
} from "lucide-react";
import type { CallType } from "@/types/call";
import { useAuthStore } from "@/stores/auth.store";
import { CallControls } from "./CallControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CallSessionPayload = {
  token: string | null;
  roomName: string;
  provider: "livekit" | "demo";
  callType: CallType;
  chatId: string | null;
  participantName: string;
  startedAt: string;
};

type ClipKind = "voice" | "circle";

type SavedClip = {
  id: string;
  kind: ClipKind;
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
  uploadState: "idle" | "uploading" | "uploaded" | "error";
  remoteUrl: string | null;
  publishState: "idle" | "publishing" | "published" | "error";
  publishedId: string | null;
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const isMediaSupported = () =>
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof MediaRecorder !== "undefined";

export const CommunicationsLab = () => {
  const authUser = useAuthStore((state) => state.user);
  const isPremium = Boolean(authUser?.isPremium);
  const currentUserId = authUser?.id ?? null;
  const clipsRef = useRef<SavedClip[]>([]);
  const callVideoRef = useRef<HTMLVideoElement | null>(null);
  const circlePreviewRef = useRef<HTMLVideoElement | null>(null);
  const callStreamRef = useRef<MediaStream | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const circleStreamRef = useRef<MediaStream | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const circleRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const circleChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [callSession, setCallSession] = useState<CallSessionPayload | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callDurationMs, setCallDurationMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState<CallType | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDurationMs, setVoiceDurationMs] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isRecordingCircle, setIsRecordingCircle] = useState(false);
  const [circleDurationMs, setCircleDurationMs] = useState(0);
  const [circleError, setCircleError] = useState<string | null>(null);
  const [clips, setClips] = useState<SavedClip[]>([]);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    if (!callSession) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setCallDurationMs(Date.now() - new Date(callSession.startedAt).getTime());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [callSession]);

  useEffect(() => {
    let interval: number | null = null;

    if (isRecordingVoice) {
      const startedAt = Date.now();
      interval = window.setInterval(() => {
        setVoiceDurationMs(Date.now() - startedAt);
      }, 250);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isRecordingVoice]);

  useEffect(() => {
    let interval: number | null = null;

    if (isRecordingCircle) {
      const startedAt = Date.now();
      interval = window.setInterval(() => {
        setCircleDurationMs(Date.now() - startedAt);
      }, 250);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isRecordingCircle]);

  useEffect(() => {
    return () => {
      for (const clip of clipsRef.current) {
        URL.revokeObjectURL(clip.url);
      }
      if (callStreamRef.current) {
        callStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (circleStreamRef.current) {
        circleStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const bindVideo = (element: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!element) {
      return;
    }
    element.srcObject = stream;
    void element.play().catch(() => undefined);
  };

  const stopMeter = () => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicLevel(0);
  };

  const startMeter = async (stream: MediaStream) => {
    stopMeter();
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setMicLevel(average / 255);
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };
    tick();
  };

  const stopStream = (stream: MediaStream | null, element?: HTMLVideoElement | null) => {
    if (!stream) {
      return;
    }
    stream.getTracks().forEach((track) => track.stop());
    if (element) {
      element.srcObject = null;
    }
  };

  const saveClip = (kind: ClipKind, blob: Blob, durationMs: number) => {
    const url = URL.createObjectURL(blob);
    setClips((current) => [
      {
        id: crypto.randomUUID(),
        kind,
        blob,
        url,
        durationMs,
        mimeType: blob.type || (kind === "voice" ? "audio/webm" : "video/webm"),
        uploadState: "idle",
        remoteUrl: null,
        publishState: "idle",
        publishedId: null,
      },
      ...current,
    ]);
  };

  const startCall = async (callType: CallType) => {
    if (!isMediaSupported()) {
      setCallError("This browser does not support camera or microphone capture.");
      return;
    }

    try {
      setCallError(null);
      setIsStartingCall(callType);

      if (callStreamRef.current) {
        stopStream(callStreamRef.current, callVideoRef.current);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          callType === "video"
            ? {
                facingMode: "user",
                width: { ideal: 960 },
                height: { ideal: 720 },
              }
            : false,
      });

      callStreamRef.current = stream;
      setIsMuted(false);
      setIsVideoOff(callType === "audio");
      bindVideo(callVideoRef.current, stream);
      await startMeter(stream);

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: `tepla-${callType}-${Date.now()}`,
          participantName: `desktop-${crypto.randomUUID().slice(0, 8)}`,
          callType,
          chatId: "communications-lab",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to start call.");
      }

      const payload = (await response.json()) as CallSessionPayload;
      setCallSession(payload);
      setCallDurationMs(0);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Failed to start call.");
      if (callStreamRef.current) {
        stopStream(callStreamRef.current, callVideoRef.current);
        callStreamRef.current = null;
      }
      stopMeter();
    } finally {
      setIsStartingCall(null);
    }
  };

  const endCall = () => {
    if (callStreamRef.current) {
      stopStream(callStreamRef.current, callVideoRef.current);
      callStreamRef.current = null;
    }
    stopMeter();
    setCallSession(null);
    setCallDurationMs(0);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    const stream = callStreamRef.current;
    if (!stream) {
      return;
    }

    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const stream = callStreamRef.current;
    if (!stream) {
      return;
    }
    if (stream.getVideoTracks().length === 0) {
      return;
    }

    const nextVideoOff = !isVideoOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOff;
    });
    setIsVideoOff(nextVideoOff);
  };

  const startVoiceRecording = async () => {
    if (!isMediaSupported()) {
      setVoiceError("This browser does not support voice recording.");
      return;
    }

    try {
      setVoiceError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      await startMeter(stream);

      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: isPremium ? 256000 : 64000,
      });
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        saveClip("voice", blob, voiceDurationMs);
        if (voiceStreamRef.current) {
          stopStream(voiceStreamRef.current);
          voiceStreamRef.current = null;
        }
        stopMeter();
        setIsRecordingVoice(false);
        setVoiceDurationMs(0);
      };

      recorder.start(250);
      setVoiceDurationMs(0);
      setIsRecordingVoice(true);
    } catch (error) {
      setVoiceError(
        error instanceof Error ? error.message : "Failed to start voice recording.",
      );
      if (voiceStreamRef.current) {
        stopStream(voiceStreamRef.current);
        voiceStreamRef.current = null;
      }
      stopMeter();
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
      voiceRecorderRef.current.stop();
    }
  };

  const startCircleRecording = async () => {
    if (!isMediaSupported()) {
      setCircleError("This browser does not support video circle recording.");
      return;
    }

    try {
      setCircleError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      });

      circleStreamRef.current = stream;
      bindVideo(circlePreviewRef.current, stream);
      await startMeter(stream);

      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: isPremium ? 192000 : 96000,
        videoBitsPerSecond: isPremium ? 6000000 : 2500000,
      });
      circleRecorderRef.current = recorder;
      circleChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          circleChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(circleChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        saveClip("circle", blob, circleDurationMs);
        if (circleStreamRef.current) {
          stopStream(circleStreamRef.current, circlePreviewRef.current);
          circleStreamRef.current = null;
        }
        stopMeter();
        setIsRecordingCircle(false);
        setCircleDurationMs(0);
      };

      recorder.start(250);
      setCircleDurationMs(0);
      setIsRecordingCircle(true);
    } catch (error) {
      setCircleError(
        error instanceof Error ? error.message : "Failed to start video circle recording.",
      );
      if (circleStreamRef.current) {
        stopStream(circleStreamRef.current, circlePreviewRef.current);
        circleStreamRef.current = null;
      }
      stopMeter();
    }
  };

  const stopCircleRecording = () => {
    if (circleRecorderRef.current && circleRecorderRef.current.state !== "inactive") {
      circleRecorderRef.current.stop();
    }
  };

  const uploadClip = async (clipId: string) => {
    const clip = clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    setClips((current) =>
      current.map((item) =>
        item.id === clipId ? { ...item, uploadState: "uploading" } : item,
      ),
    );

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([clip.blob], `${clip.kind}-${clip.id}.webm`, {
          type: clip.mimeType,
        }),
      );
      formData.append("type", clip.kind === "voice" ? "voice" : "circle");
      if (currentUserId) {
        formData.append("userId", currentUserId);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Upload failed.");
      }

      const payload = (await response.json()) as { url: string };
      setClips((current) =>
        current.map((item) =>
          item.id === clipId
            ? { ...item, uploadState: "uploaded", remoteUrl: payload.url }
            : item,
        ),
      );
    } catch {
      setClips((current) =>
        current.map((item) =>
          item.id === clipId ? { ...item, uploadState: "error" } : item,
        ),
      );
    }
  };

  const publishCircle = async (clipId: string) => {
    const clip = clips.find((item) => item.id === clipId);
    if (!clip || clip.kind !== "circle" || !clip.remoteUrl) {
      return;
    }

    setClips((current) =>
      current.map((item) =>
        item.id === clipId ? { ...item, publishState: "publishing" } : item,
      ),
    );

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId ?? "communications-lab",
          mediaUrl: clip.remoteUrl,
          type: "circle",
          caption: "Video circle from Calls & Media Lab",
          privacy: "private",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to publish circle.");
      }

      const payload = (await response.json()) as { story: { id: string } };
      setClips((current) =>
        current.map((item) =>
          item.id === clipId
            ? {
                ...item,
                publishState: "published",
                publishedId: payload.story.id,
              }
            : item,
        ),
      );
    } catch {
      setClips((current) =>
        current.map((item) =>
          item.id === clipId ? { ...item, publishState: "error" } : item,
        ),
      );
    }
  };

  const meterBars = Array.from({ length: 12 }, (_, index) => {
    const active = micLevel * 12 > index;
    return (
      <span
        key={index}
        className={`h-6 w-1 rounded-full transition-all ${
          active ? "bg-sky-300" : "bg-white/10"
        }`}
      />
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(2,8,24,0.88),rgba(3,10,32,0.76))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-sky-300" />
              Calls Studio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  void startCall("audio");
                }}
                disabled={Boolean(isStartingCall)}
              >
                {isStartingCall === "audio" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Start audio call
              </Button>
              <Button
                type="button"
                size="lg"
                variant="subtle"
                onClick={() => {
                  void startCall("video");
                }}
                disabled={Boolean(isStartingCall)}
              >
                {isStartingCall === "video" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Start video call
              </Button>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {callSession
                      ? `${callSession.callType === "video" ? "Video" : "Audio"} call active`
                      : "Ready for a live preview"}
                  </p>
                  <p className="mt-1 text-xs text-tepla-text-muted">
                    {callSession
                      ? `Provider: ${callSession.provider} / Room: ${callSession.roomName} / ${formatDuration(callDurationMs)}`
                      : "Grant camera and microphone access to test in-app audio and video calling."}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-sky-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {callSession?.provider === "livekit" ? "Realtime ready" : "Demo-safe fallback"}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,0.9fr]">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                  {callSession?.callType === "video" ? (
                    <video
                      ref={callVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`aspect-video h-full w-full object-cover ${
                        isVideoOff ? "opacity-20" : "opacity-100"
                      }`}
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),transparent_42%),linear-gradient(180deg,#020617,#030b1f)]">
                      <div className="text-center">
                        <AudioLines className="mx-auto h-10 w-10 text-sky-300" />
                        <p className="mt-3 text-sm text-white">Audio call preview</p>
                        <p className="mt-1 text-xs text-tepla-text-muted">
                          Mic activity and live controls stay active here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-tepla-text-muted">
                      Input level
                    </p>
                    <div className="mt-3 flex items-end gap-1">{meterBars}</div>
                    <p className="mt-3 text-xs text-tepla-text-muted">
                      Shared mic meter for calls, voice notes, and video circles.
                    </p>
                  </div>

                  {callSession ? (
                    <CallControls
                      isMuted={isMuted}
                      isVideoOff={isVideoOff}
                      canToggleVideo={callSession.callType === "video"}
                      onToggleMute={toggleMute}
                      onToggleVideo={toggleVideo}
                      onEndCall={endCall}
                    />
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-tepla-text-muted">
                      Start a call to unlock mute, camera, and hang-up controls.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {callError ? <p className="text-xs text-tepla-danger">{callError}</p> : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(2,8,24,0.88),rgba(3,10,32,0.76))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4 text-sky-300" />
              Voice Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">
                {isRecordingVoice
                  ? "Recording voice note..."
                  : isPremium
                    ? "Premium HQ voice capture"
                    : "Quick voice message capture"}
              </p>
              <p className="mt-1 text-xs text-tepla-text-muted">
                {isPremium
                  ? "Record high-quality voice notes, preview them, and upload them to cloud storage."
                  : "Record a Telegram-style voice note, preview it, and upload it to media storage."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (isRecordingVoice) {
                      stopVoiceRecording();
                    } else {
                      void startVoiceRecording();
                    }
                  }}
                >
                  <Mic className="h-4 w-4" />
                  {isRecordingVoice ? "Stop recording" : "Record voice note"}
                </Button>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white">
                  {formatDuration(voiceDurationMs)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-sky-200">
                  {isPremium ? "Premium HQ" : "Standard quality"}
                </span>
              </div>
            </div>
            {voiceError ? <p className="text-xs text-tepla-danger">{voiceError}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(2,8,24,0.88),rgba(3,10,32,0.76))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CirclePlay className="h-4 w-4 text-sky-300" />
            Video Circles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
            <div className="space-y-4">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-4">
                <div className="mx-auto flex w-fit flex-col items-center">
                  <div className="overflow-hidden rounded-full border border-white/10 bg-black">
                    <video
                      ref={circlePreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-44 w-44 object-cover"
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">
                    {isRecordingCircle ? "Recording video circle..." : "Circular video preview"}
                  </p>
                  <p className="mt-1 text-xs text-tepla-text-muted">
                    Great for fast async updates, demos, or reactions.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="subtle"
                  onClick={() => {
                    if (isRecordingCircle) {
                      stopCircleRecording();
                    } else {
                      void startCircleRecording();
                    }
                  }}
                >
                  <Video className="h-4 w-4" />
                  {isRecordingCircle ? "Stop circle" : "Record circle"}
                </Button>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white">
                  {formatDuration(circleDurationMs)}
                </span>
              </div>
              {circleError ? <p className="text-xs text-tepla-danger">{circleError}</p> : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Recent voice notes and circles</p>
              {clips.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-tepla-text-muted">
                  Your recorded media will appear here with preview, upload state, and circle publishing controls.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {clips.map((clip) => (
                    <div key={clip.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {clip.kind === "voice" ? "Voice note" : "Video circle"}
                          </p>
                          <p className="mt-1 text-xs text-tepla-text-muted">
                            {formatDuration(clip.durationMs)}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-sky-300">
                          {clip.uploadState}
                        </span>
                      </div>

                      <div className="mt-3">
                        {clip.kind === "voice" ? (
                          <audio controls src={clip.url} className="w-full" />
                        ) : (
                          <div className="flex justify-center">
                            <video controls playsInline src={clip.url} className="h-36 w-36 rounded-full object-cover" />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="subtle"
                          size="sm"
                          disabled={clip.uploadState === "uploading"}
                          onClick={() => {
                            void uploadClip(clip.id);
                          }}
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          {clip.uploadState === "uploaded" ? "Uploaded" : "Upload"}
                        </Button>
                        {clip.kind === "circle" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!clip.remoteUrl || clip.publishState === "publishing" || clip.publishState === "published"}
                            onClick={() => {
                              void publishCircle(clip.id);
                            }}
                          >
                            <CirclePlay className="h-3.5 w-3.5" />
                            {clip.publishState === "published" ? "Published" : "Publish circle"}
                          </Button>
                        ) : null}
                      </div>

                      {clip.remoteUrl ? (
                        <p className="mt-2 truncate text-[11px] text-tepla-text-muted">
                          Media URL: {clip.remoteUrl}
                        </p>
                      ) : null}
                      {clip.publishedId ? (
                        <p className="mt-1 text-[11px] text-sky-300">Circle story id: {clip.publishedId}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
