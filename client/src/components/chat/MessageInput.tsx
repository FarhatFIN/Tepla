"use client";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useShallow } from "zustand/react/shallow";
import IconButton from "@/components/ui/IconButton";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettingsStore } from "@/stores/settings-store";

interface MessageInputProps { chatId: string; }

interface PreviewFile { file: File; url: string; type: "image" | "video"; }

export default function MessageInput({ chatId }: MessageInputProps) {
  const t = useTranslation();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [caption, setCaption] = useState("");

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollType, setPollType] = useState<"regular" | "quiz">("regular");
  const [pollAnonymous, setPollAnonymous] = useState(false);

  // Location state
  const [locating, setLocating] = useState(false);

  // GIF state
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; previewUrl: string }[]>([]);

  // Video circle state
  const [recordingCircle, setRecordingCircle] = useState(false);
  const circleVideoRef = useRef<HTMLVideoElement>(null);
  const circleRecorderRef = useRef<MediaRecorder | null>(null);
  const circleChunksRef = useRef<Blob[]>([]);
  const circleTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [circleTime, setCircleTime] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, editMessage, replyingTo, editingMessage, setReplyingTo, setEditingMessage, toggleStickers, getDraft, setDraft } = useChatStore(useShallow(s => ({ sendMessage: s.sendMessage, editMessage: s.editMessage, replyingTo: s.replyingTo, editingMessage: s.editingMessage, setReplyingTo: s.setReplyingTo, setEditingMessage: s.setEditingMessage, toggleStickers: s.toggleStickers, getDraft: s.getDraft, setDraft: s.setDraft })));

  useEffect(() => {
    const draft = getDraft(chatId);
    if (draft && !editingMessage) setText(draft);
    else if (!editingMessage) setText("");
  }, [chatId, getDraft, editingMessage]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  useEffect(() => {
    if (editingMessage) { setText(editingMessage.text); textareaRef.current?.focus(); }
  }, [editingMessage]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && previews.length === 0) return;
    if (editingMessage && trimmed) {
      editMessage(chatId, editingMessage.id, trimmed);
      setText("");
      setDraft(chatId, "");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }
    if (previews.length > 0) { sendPreviews(); return; }
    sendMessage(chatId, trimmed);
    setText("");
    setDraft(chatId, "");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const sendByEnter = useSettingsStore((s) => s.sendByEnter);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send by Enter (Shift+Enter = newline). When disabled, Ctrl/Cmd+Enter sends.
    if (e.key !== "Enter") return;
    if (sendByEnter ? !e.shiftKey : e.ctrlKey || e.metaKey) { e.preventDefault(); handleSend(); }
  };

  // ── Photo/Video preview + send ──
  const handleMediaSelect = (files: FileList | null) => {
    if (!files) return;
    const newPreviews: PreviewFile[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      const type = file.type.startsWith("video/") ? "video" : "image";
      newPreviews.push({ file, url: URL.createObjectURL(file), type });
    }
    setPreviews((p) => [...p, ...newPreviews].slice(0, 10));
  };

  const removePreview = (idx: number) => {
    setPreviews((p) => { URL.revokeObjectURL(p[idx].url); return p.filter((_, i) => i !== idx); });
  };

  const sendPreviews = async () => {
    setUploading(true);
    for (let i = 0; i < previews.length; i++) {
      const p = previews[i];
      setUploadProgress(`${i + 1}/${previews.length}`);
      try {
        const res = await api.upload<{ data: { url: string; thumbnailUrl?: string; fileName: string; mimeType: string; sizeBytes: number } }>("/media/upload", p.file);
        const att = { id: `att-${Date.now()}`, type: p.type, url: res.data?.url || "", thumbnailUrl: res.data?.thumbnailUrl, fileName: p.file.name, fileSize: p.file.size, mimeType: p.file.type };
        sendMessage(chatId, caption || p.file.name, p.type, [att]);
      } catch {
        const localUrl = URL.createObjectURL(p.file);
        const att = { id: `att-${Date.now()}`, type: p.type, url: localUrl, thumbnailUrl: localUrl, fileName: p.file.name, fileSize: p.file.size, mimeType: p.file.type };
        sendMessage(chatId, caption || p.file.name, p.type, [att]);
      }
    }
    setPreviews([]);
    setCaption("");
    setUploading(false);
    setUploadProgress("");
  };

  // ── File upload ──
  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const res = await api.upload<{ data: { url: string; fileName: string; mimeType: string; sizeBytes: number } }>("/media/upload", file);
        const att = { id: `att-${Date.now()}`, type: "file" as const, url: res.data?.url || "", fileName: file.name, fileSize: file.size, mimeType: file.type };
        sendMessage(chatId, file.name, "file", [att]);
      } catch {
        const localUrl = URL.createObjectURL(file);
        const att = { id: `att-${Date.now()}`, type: "file" as const, url: localUrl, fileName: file.name, fileSize: file.size, mimeType: file.type };
        sendMessage(chatId, file.name, "file", [att]);
      }
    }
    setUploading(false);
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { alert("Microphone access denied"); }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setIsRecording(false);
    clearInterval(timerRef.current);
    await new Promise<void>((r) => { recorder.onstop = () => r(); recorder.stop(); });
    recorder.stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    const duration = recordingTime;
    setUploading(true);
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
      const res = await api.upload<{ data: { url: string } }>("/media/upload", file);
      const att = { id: `att-${Date.now()}`, type: "voice" as const, url: res.data?.url || "", duration, mimeType: blob.type };
      sendMessage(chatId, `Voice message (${formatTime(duration)})`, "voice", [att]);
    } catch {
      const localUrl = URL.createObjectURL(blob);
      const att = { id: `att-${Date.now()}`, type: "voice" as const, url: localUrl, duration, mimeType: blob.type };
      sendMessage(chatId, `Voice message (${formatTime(duration)})`, "voice", [att]);
    }
    setUploading(false);
  };

  const cancelRecording = () => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") { r.stop(); r.stream.getTracks().forEach((t) => t.stop()); }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  // ── Video circle ──
  const startCircle = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 400, height: 400 }, audio: true });
      if (circleVideoRef.current) { circleVideoRef.current.srcObject = stream; circleVideoRef.current.play(); }
      const recorder = new MediaRecorder(stream);
      circleChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) circleChunksRef.current.push(e.data); };
      recorder.start(100);
      circleRecorderRef.current = recorder;
      setRecordingCircle(true);
      setCircleTime(0);
      circleTimerRef.current = setInterval(() => {
        setCircleTime((t) => { if (t >= 59) { stopCircle(); return 60; } return t + 1; });
      }, 1000);
    } catch { alert("Camera access denied"); }
  };

  const stopCircle = async () => {
    const recorder = circleRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecordingCircle(false);
    clearInterval(circleTimerRef.current);
    await new Promise<void>((r) => { recorder.onstop = () => r(); recorder.stop(); });
    recorder.stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(circleChunksRef.current, { type: recorder.mimeType || "video/webm" });
    setUploading(true);
    try {
      const file = new File([blob], `circle_${Date.now()}.webm`, { type: blob.type });
      const res = await api.upload<{ data: { url: string; thumbnailUrl?: string } }>("/media/upload", file);
      const att = { id: `att-${Date.now()}`, type: "video_note" as const, url: res.data?.url || "", thumbnailUrl: res.data?.thumbnailUrl, duration: circleTime };
      sendMessage(chatId, `Video message (${formatTime(circleTime)})`, "video_note", [att]);
    } catch {
      const localUrl = URL.createObjectURL(blob);
      const att = { id: `att-${Date.now()}`, type: "video_note" as const, url: localUrl, thumbnailUrl: localUrl, duration: circleTime };
      sendMessage(chatId, `Video message (${formatTime(circleTime)})`, "video_note", [att]);
    }
    setUploading(false);
  };

  // ── Location ──
  const sendLocation = (isLive = false, duration = 0) => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, isLive, duration };
        sendMessage(chatId, JSON.stringify(data), "location");
        setLocating(false);
        setShowLocation(false);
      },
      () => { alert("Location access denied"); setLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  // ── Poll (server-backed with legacy fallback) ──
  const sendPoll = async () => {
    const validOpts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOpts.length < 2) return;
    try {
      await api.post("/polls", {
        chatId,
        question: pollQuestion.trim(),
        options: validOpts,
        isAnonymous: pollAnonymous,
        isQuiz: pollType === "quiz",
        correctOption: pollType === "quiz" ? 0 : null,
      });
    } catch {
      // Fallback: legacy JSON poll message when the polls API is unavailable
      const data = { question: pollQuestion, options: validOpts, type: pollType, isAnonymous: pollAnonymous, votes: validOpts.map(() => 0), correctOptionId: 0 };
      sendMessage(chatId, JSON.stringify(data), "poll");
    }
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPoll(false);
  };

  // ── GIF search (GIPHY API) ──
  const searchGifs = async () => {
    const key = "NxlUvPE2ZaimOBQhmx0CbGhehV4HBMGr";
    const q = gifQuery.trim() || "trending";
    try {
      const endpoint = gifQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifResults((json.data || []).map((g: any) => ({
        id: g.id,
        url: g.images?.original?.url || g.images?.downsized?.url || "",
        previewUrl: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || g.images?.fixed_width?.url || "",
      })));
    } catch {
      setGifResults([]);
    }
  };

  const sendGif = (gif: { url: string; previewUrl: string }) => {
    const att = { id: `att-${Date.now()}`, type: "gif" as const, url: gif.url, thumbnailUrl: gif.previewUrl, mimeType: "image/gif" };
    sendMessage(chatId, gif.url, "gif", [att]);
    setShowGif(false);
    setGifQuery("");
    setGifResults([]);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const hasText = text.trim().length > 0;

  const attachOptions = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: t("photo_video"), color: "text-[#8B5CF6]", action: "media" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: t("file"), color: "text-[#C4B5FD]", action: "file" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: t("location"), color: "text-[#00D46A]", action: "location" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>, label: t("poll"), color: "text-[#F59E0B]", action: "poll" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>, label: t("gif"), color: "text-[#6C3DE8]", action: "gif" },
  ];

  const handleAttachAction = (action: (typeof attachOptions)[number]["action"]) => {
    setShowAttach(false);
    switch (action) {
      case "media":
        mediaInputRef.current?.click();
        break;
      case "file":
        fileInputRef.current?.click();
        break;
      case "location":
        setShowLocation(true);
        break;
      case "poll":
        setShowPoll(true);
        break;
      case "gif":
        setShowGif(true);
        searchGifs();
        break;
    }
  };

  // ── Video circle recording overlay ──
  if (recordingCircle) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in" style={{ background: "radial-gradient(ellipse at center, rgba(108,61,232,0.15) 0%, rgba(10,6,18,0.95) 70%)" }}>
        <div className="relative w-[250px] h-[250px] rounded-full overflow-hidden ring-4 ring-[#6C3DE8]">
          <video ref={circleVideoRef} className="w-full h-full object-cover" muted playsInline />
        </div>
        <p className="mt-4 text-white text-lg font-semibold">{formatTime(circleTime)} / 1:00</p>
        <div className="mt-4 flex gap-4">
          <button onClick={() => { circleRecorderRef.current?.stop(); circleRecorderRef.current?.stream.getTracks().forEach(tr => tr.stop()); setRecordingCircle(false); clearInterval(circleTimerRef.current); }} className="rounded-full bg-[#2A1D4A] px-6 py-2 text-white">{t("cancel")}</button>
          <button onClick={stopCircle} className="rounded-full px-6 py-2 text-white font-semibold" style={{ background: "linear-gradient(135deg, #5B21B6, #6C3DE8)" }}>{t("send")}</button>
        </div>
      </div>
    );
  }

  const handleScheduleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    try {
      await api.post("/scheduled", { chatId, content: trimmed, scheduledAt });
    } catch { /* fallback: just send normally */ }
    setText("");
    setDraft(chatId, "");
    setShowSchedule(false);
    setScheduleDate("");
    setScheduleTime("");
  };

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5 transition-colors" style={{ backdropFilter: "blur(12px)" }}>
      {/* Hidden file inputs */}
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handleMediaSelect(e.target.files); e.target.value = ""; }} />
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }} />

      {/* Photo/Video preview */}
      {previews.length > 0 && (
        <div className="mb-2 animate-slide-up">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {previews.map((p, i) => (
              <div key={i} className="relative shrink-0 rounded-lg overflow-hidden">
                {p.type === "image" ? (
                  <img src={p.url} alt="" className="h-20 w-20 object-cover" />
                ) : (
                  <video src={p.url} className="h-20 w-20 object-cover" />
                )}
                <button onClick={() => removePreview(i)} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("add_caption")} className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none mb-2" />
          <div className="flex gap-2">
            <button onClick={() => { previews.forEach(p => URL.revokeObjectURL(p.url)); setPreviews([]); setCaption(""); }} className="flex-1 rounded-lg bg-[var(--bg-input)] py-1.5 text-sm text-[var(--text-secondary)]">{t("cancel")}</button>
            <button onClick={sendPreviews} disabled={uploading} className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {uploading ? t("sending_progress", { progress: uploadProgress }) : t("send_files", { count: previews.length })}
            </button>
          </div>
        </div>
      )}

      {/* Location picker */}
      {showLocation && (
        <div className="mb-2 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in">
          <p className="text-sm font-semibold mb-2">{t("share_location")}</p>
          <div className="flex flex-col gap-2">
            <button onClick={() => sendLocation(false)} disabled={locating} className="rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {locating ? t("getting_location") : t("send_current_location")}
            </button>
            <button onClick={() => sendLocation(true, 900)} disabled={locating} className="rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00D46A] animate-pulse" />{t("live_location_15")}
            </button>
            <button onClick={() => sendLocation(true, 3600)} disabled={locating} className="rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00D46A] animate-pulse" />{t("live_location_60")}
            </button>
          </div>
          <button onClick={() => setShowLocation(false)} className="mt-2 text-xs text-[var(--text-tertiary)]">{t("cancel")}</button>
        </div>
      )}

      {/* Poll creator */}
      {showPoll && (
        <div className="mb-2 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in">
          <p className="text-sm font-semibold mb-2">{t("create_poll")}</p>
          <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder={t("ask_question")} className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none mb-2" />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-1 mb-1">
              <input type="text" value={opt} onChange={(e) => setPollOptions(o => o.map((v, j) => j === i ? e.target.value : v))} placeholder={t("option_n", { n: i + 1 })} className="flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" />
              {pollOptions.length > 2 && <button onClick={() => setPollOptions(o => o.filter((_, j) => j !== i))} className="text-red-400 p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
            </div>
          ))}
          {pollOptions.length < 10 && <button onClick={() => setPollOptions(o => [...o, ""])} className="text-xs text-[var(--accent)] mt-1">{t("add_option")}</button>}
          <div className="flex gap-2 mt-2">
            <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <input type="checkbox" checked={pollAnonymous} onChange={(e) => setPollAnonymous(e.target.checked)} className="rounded" /> {t("anonymous")}
            </label>
            <select value={pollType} onChange={(e) => setPollType(e.target.value as "regular" | "quiz")} className="rounded bg-[var(--bg-input)] px-2 py-1 text-xs text-[var(--text-primary)]">
              <option value="regular">{t("regular")}</option>
              <option value="quiz">{t("quiz")}</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowPoll(false)} className="flex-1 rounded-lg bg-[var(--bg-input)] py-1.5 text-sm text-[var(--text-secondary)]">{t("cancel")}</button>
            <button onClick={sendPoll} className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-sm font-semibold text-white">{t("send_poll")}</button>
          </div>
        </div>
      )}

      {/* GIF picker */}
      {showGif && (
        <div className="mb-2 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <input type="text" value={gifQuery} onChange={(e) => setGifQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchGifs(); }} placeholder={t("search_gifs")} className="flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" />
            <button onClick={() => { setShowGif(false); setGifResults([]); }} className="text-[var(--text-tertiary)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {gifResults.map((g) => (
              <button key={g.id} onClick={() => sendGif(g)} className="overflow-hidden rounded-lg hover:ring-2 hover:ring-[var(--accent)]">
                <img src={g.previewUrl} alt="" className="w-full h-20 object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule picker */}
      {showSchedule && (
        <div className="mb-2 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in">
          <p className="text-sm font-semibold mb-2">{t("schedule_message") || "Schedule message"}</p>
          <div className="flex gap-2 mb-2">
            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none" />
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="flex-1 rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSchedule(false)} className="flex-1 rounded-lg bg-[var(--bg-input)] py-1.5 text-sm text-[var(--text-secondary)]">{t("cancel")}</button>
            <button onClick={handleScheduleSend} disabled={!scheduleDate || !scheduleTime || !text.trim()} className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-sm font-semibold text-white disabled:opacity-50">{t("schedule") || "Schedule"}</button>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {uploading && !previews.length && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 animate-slide-up">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span className="text-xs text-[var(--accent)]">{t("sending_progress", { progress: uploadProgress || "..." })}</span>
        </div>
      )}

      {/* Reply / Edit bar */}
      {(replyingTo || editingMessage) && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 animate-slide-up">
          <div className="h-8 w-0.5 rounded-full bg-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--accent)]">{editingMessage ? t("edited") : `${t("reply")} → ${replyingTo?.senderName}`}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{editingMessage?.text || replyingTo?.text}</p>
          </div>
          <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setText(""); }} className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        {isRecording ? (
          <div className="flex flex-1 items-center gap-3 rounded-xl bg-red-500/10 px-4 py-2.5">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">{formatTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">{t("cancel")}</button>
            <button onClick={stopRecording} className="rounded-lg bg-red-500 px-3 py-1 text-sm font-medium text-white">{t("send")}</button>
          </div>
        ) : (
          <>
            {/* Attach */}
            <div className="relative">
              <IconButton label={t("attach")} onClick={() => { setShowAttach(!showAttach); setShowLocation(false); setShowPoll(false); setShowGif(false); }} size="sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </IconButton>
              {showAttach && (
                <div className="absolute bottom-12 left-0 z-20 w-48 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in">
                  {attachOptions.map((opt) => (
                    <button key={opt.label} onClick={() => handleAttachAction(opt.action)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]">
                      <span className={opt.color}>{opt.icon}</span>
                      <span className="text-[var(--text-primary)]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea ref={textareaRef} rows={1} value={text} onChange={(e) => { setText(e.target.value); setDraft(chatId, e.target.value); }} onKeyDown={handleKeyDown}
              placeholder={t("message_placeholder")} className="max-h-[120px] min-h-[36px] flex-1 resize-none rounded-xl bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors" />

            {/* Stickers */}
            <IconButton label={t("stickers")} onClick={toggleStickers} size="sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </IconButton>

            {/* Video circle */}
            <IconButton label="Video circle" onClick={startCircle} size="sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
            </IconButton>

            {/* Send / Voice */}
            {hasText || previews.length > 0 ? (
              <div className="relative">
                <IconButton label={t("send")} onClick={handleSend} variant="filled" size="sm"
                  onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); setShowSendMenu(!showSendMenu); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </IconButton>
                {showSendMenu && (
                  <div className="absolute bottom-12 right-0 z-20 w-52 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in">
                    <button onClick={() => { const trimmed = text.trim(); if (!trimmed) return; sendMessage(chatId, trimmed, "text", undefined); setText(""); setDraft(chatId, ""); setShowSendMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0-6 6v5.18l-.83.83A1 1 0 0 0 5.88 17h12.24a1 1 0 0 0 .71-1.71L18 14.18V9a6 6 0 0 0-6-6z" opacity="0.5"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2"/></svg>
                      <span>{t("send_without_sound") || "Send without sound"}</span>
                    </button>
                    <button onClick={() => { setShowSchedule(true); setShowSendMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>{t("schedule_message") || "Schedule message"}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <IconButton label={t("voice_message")} onClick={startRecording} size="sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </IconButton>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
