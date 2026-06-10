"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, SendHorizontal, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type VoiceRecording = {
  blob: Blob;
  url: string;
  durationSeconds: number;
  fileName: string;
  mimeType: string;
};

type VoiceRecorderProps = {
  disabled?: boolean;
  highQuality?: boolean;
  onSend: (recording: VoiceRecording) => Promise<void>;
};

const formatDuration = (durationSeconds: number) => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const VoiceRecorder = ({ disabled, highQuality, onSend }: VoiceRecorderProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      if (recording?.url) {
        URL.revokeObjectURL(recording.url);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recording]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const resetRecording = () => {
    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
    }

    setRecording(null);
    setDurationSeconds(0);
    setError(null);
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: highQuality ? 256_000 : 64_000,
      });
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setDurationSeconds(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const duration = Math.max(
          1,
          Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000),
        );
        const url = URL.createObjectURL(blob);

        setRecording({
          blob,
          url,
          durationSeconds: duration,
          fileName: `voice-${Date.now()}.webm`,
          mimeType: mediaRecorder.mimeType || "audio/webm",
        });
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopStream();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDurationSeconds((current) => current + 1);
      }, 1000);
    } catch {
      setError("Microphone permission is required for voice messages.");
      stopStream();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const sendRecording = async () => {
    if (!recording) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await onSend(recording);
      resetRecording();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Failed to send voice message.",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (recording) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-center gap-3">
          <audio controls src={recording.url} className="h-10 flex-1" />
          <span className="text-xs text-tepla-text-muted">
            {formatDuration(recording.durationSeconds)}
          </span>
          <Button type="button" variant="ghost" size="icon" onClick={resetRecording}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            disabled={isSending}
            onClick={() => {
              void sendRecording();
            }}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-tepla-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isRecording ? "danger" : "ghost"}
        size="icon"
        disabled={disabled || isSending}
        aria-label={isRecording ? "Stop recording" : "Record voice note"}
        onClick={() => {
          if (isRecording) {
            stopRecording();
            return;
          }

          void startRecording();
        }}
      >
        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      {isRecording ? (
        <div className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-100">
          Recording {formatDuration(durationSeconds)}
        </div>
      ) : null}
      {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}
    </div>
  );
};
