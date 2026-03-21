"use client";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import IconButton from "@/components/ui/IconButton";

interface MessageInputProps { chatId: string; }

export default function MessageInput({ chatId }: MessageInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const { sendMessage, replyingTo, editingMessage, setReplyingTo, setEditingMessage, toggleStickers, getDraft, setDraft } = useChatStore();

  // Load draft on chat switch
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
    if (!trimmed) return;
    sendMessage(chatId, trimmed);
    setText("");
    setDraft(chatId, ""); // clear draft on send
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    sendMessage(chatId, `Voice message (${formatTime(recordingTime)})`, "voice");
  };

  const cancelRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const hasText = text.trim().length > 0;

  const attachOptions = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: "Photo/Video", color: "text-violet-400" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: "File", color: "text-sky-400" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: "Location", color: "text-emerald-400" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: "Contact", color: "text-amber-400" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>, label: "Poll", color: "text-pink-400" },
  ];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5 transition-colors">
      {/* Reply / Edit bar */}
      {(replyingTo || editingMessage) && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 animate-slide-up">
          <div className="h-8 w-0.5 rounded-full bg-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--accent)]">{editingMessage ? "Editing" : `Reply to ${replyingTo?.senderName}`}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{editingMessage?.text || replyingTo?.text}</p>
          </div>
          <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setText(""); }} className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        {isRecording ? (
          /* Recording UI */
          <div className="flex flex-1 items-center gap-3 rounded-xl bg-red-500/10 px-4 py-2.5">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">{formatTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancel</button>
            <button onClick={stopRecording} className="rounded-lg bg-red-500 px-3 py-1 text-sm font-medium text-white">Send</button>
          </div>
        ) : (
          <>
            {/* Attach */}
            <div className="relative">
              <IconButton label="Attach" onClick={() => setShowAttach(!showAttach)} size="sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </IconButton>
              {showAttach && (
                <div className="absolute bottom-12 left-0 z-20 w-48 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in">
                  {attachOptions.map((opt) => (
                    <button key={opt.label} onClick={() => setShowAttach(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]">
                      <span className={opt.color}>{opt.icon}</span>
                      <span className="text-[var(--text-primary)]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea ref={textareaRef} rows={1} value={text} onChange={(e) => { setText(e.target.value); setDraft(chatId, e.target.value); }} onKeyDown={handleKeyDown}
              placeholder="Message..." className="max-h-[120px] min-h-[36px] flex-1 resize-none rounded-xl bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors" />

            {/* Stickers */}
            <IconButton label="Stickers" onClick={toggleStickers} size="sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </IconButton>

            {/* Schedule */}
            <div className="relative">
              <IconButton label="Schedule" onClick={() => setShowSchedule(!showSchedule)} size="sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </IconButton>
              {showSchedule && (
                <div className="absolute bottom-12 right-0 z-20 w-56 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in">
                  <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Schedule message</p>
                  <input type="datetime-local" className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none" />
                  <button onClick={() => { setShowSchedule(false); if (text.trim()) handleSend(); }} className="mt-2 w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
                    Schedule
                  </button>
                </div>
              )}
            </div>

            {/* Send / Voice */}
            {hasText ? (
              <IconButton label="Send" onClick={handleSend} variant="filled" size="sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </IconButton>
            ) : (
              <IconButton label="Voice message" onClick={startRecording} size="sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </IconButton>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
