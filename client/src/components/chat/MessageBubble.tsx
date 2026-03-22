"use client";
import { memo, useRef, useState } from "react";
import { Message, MessageStatus, MessageAttachment } from "@/types";
import { useChatStore } from "@/stores/chat-store";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const quickReactions = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F622}", "\u{1F525}", "\u{1F680}", "\u{1F914}", "\u{1F60D}"];

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "sending") return <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />;
  if (status === "failed") return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
  if (status === "sent") return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
  const color = status === "read" ? "text-sky-300" : "";
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={color}><polyline points="18 6 7 17 2 12"/><polyline points="22 6 11 17"/></svg>;
}

// Voice message player
function VoicePlayer({ attachment, isOwn }: { attachment: MessageAttachment; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.playbackRate = speed; a.play(); }
    setPlaying(!playing);
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const bars = attachment.waveform || Array.from({ length: 24 }, () => Math.random() * 0.7 + 0.3);

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-[200px]">
      {attachment.url && <audio ref={audioRef} src={attachment.url} onTimeUpdate={(e) => { const a = e.currentTarget; setProgress(a.duration ? a.currentTime / a.duration : 0); }} onEnded={() => { setPlaying(false); setProgress(0); }} preload="metadata" />}
      <button onClick={toggle} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOwn ? "bg-white/20" : "bg-[var(--accent)]/20"}`}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>
      <div className="flex flex-1 items-end gap-[2px] h-6">
        {bars.map((h, i) => (
          <div key={i} className={`w-[3px] rounded-full transition-colors ${i / bars.length <= progress ? (isOwn ? "bg-white" : "bg-[var(--accent)]") : (isOwn ? "bg-white/30" : "bg-[var(--text-tertiary)]")}`} style={{ height: `${h * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-[var(--text-tertiary)]"}`}>{attachment.duration ? `${Math.floor(attachment.duration / 60)}:${(attachment.duration % 60).toString().padStart(2, "0")}` : "0:00"}</span>
        <button onClick={cycleSpeed} className={`text-[10px] font-bold ${isOwn ? "text-white/60 hover:text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>{speed}x</button>
      </div>
    </div>
  );
}

// Image/video attachment renderer
function MediaContent({ attachment, isOwn }: { attachment: MessageAttachment; isOwn: boolean }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [spoiler, setSpoiler] = useState(false);

  if (attachment.type === "image" || attachment.type === "sticker" || attachment.type === "gif") {
    return (
      <>
        <div className="relative cursor-pointer overflow-hidden rounded-lg" onClick={() => setFullscreen(true)}>
          {spoiler && <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xl bg-black/30" onClick={(e) => { e.stopPropagation(); setSpoiler(false); }}><span className="text-white text-sm font-medium">Tap to reveal</span></div>}
          <img src={attachment.thumbnailUrl || attachment.url} alt={attachment.fileName || ""} className="max-h-[300px] max-w-full object-cover" loading="lazy" />
        </div>
        {fullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in" onClick={() => setFullscreen(false)}>
            <img src={attachment.url} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
            <button className="absolute top-4 right-4 text-white p-2" onClick={() => setFullscreen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
      </>
    );
  }

  if (attachment.type === "video") {
    return (
      <div className="relative overflow-hidden rounded-lg max-w-[320px]">
        <video src={attachment.url} poster={attachment.thumbnailUrl} controls className="max-h-[300px] w-full" preload="metadata" />
      </div>
    );
  }

  if (attachment.type === "video_note") {
    return (
      <div className="relative overflow-hidden rounded-full w-[200px] h-[200px]">
        <video src={attachment.url} poster={attachment.thumbnailUrl} className="w-full h-full object-cover" onClick={(e) => { const v = e.currentTarget; v.paused ? v.play() : v.pause(); }} preload="metadata" loop playsInline muted autoPlay />
      </div>
    );
  }

  if (attachment.type === "voice") {
    return <VoicePlayer attachment={attachment} isOwn={isOwn} />;
  }

  if (attachment.type === "file") {
    return (
      <a href={attachment.url} download={attachment.fileName} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOwn ? "bg-white/10 hover:bg-white/20" : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]"} transition-colors`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.fileName || "File"}</p>
          {attachment.fileSize && <p className={`text-[10px] ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`}>{(attachment.fileSize / 1024 / 1024).toFixed(1)} MB</p>}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    );
  }

  return null;
}

// Location message
function LocationContent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  try {
    const loc = JSON.parse(message.text);
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=15&size=300x200&markers=${loc.lat},${loc.lng}&key=static`;
    return (
      <div className="px-1 pt-1">
        <div className="overflow-hidden rounded-lg bg-[var(--bg-input)]" style={{ width: 260, height: 160 }}>
          <div className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
            <div className="text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <p className="text-xs">{loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</p>
              {loc.isLive && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

// Poll message
function PollContent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const [voted, setVoted] = useState<number | null>(null);
  try {
    const poll = JSON.parse(message.text);
    const totalVotes = (poll.votes || []).reduce((s: number, v: number) => s + v, 0) || 0;
    return (
      <div className="px-3 py-2 min-w-[220px]">
        <p className="text-sm font-semibold mb-2">{poll.question}</p>
        {poll.type === "quiz" && voted !== null && <p className={`text-[10px] mb-1 ${voted === poll.correctOptionId ? "text-emerald-400" : "text-red-400"}`}>{voted === poll.correctOptionId ? "Correct!" : "Wrong"}</p>}
        <div className="flex flex-col gap-1.5">
          {(poll.options || []).map((opt: string, i: number) => {
            const votes = poll.votes?.[i] || 0;
            const pct = totalVotes ? Math.round(votes / totalVotes * 100) : 0;
            const isVoted = voted === i;
            return (
              <button key={i} onClick={() => { if (voted === null) setVoted(i); }} disabled={voted !== null} className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${isVoted ? (isOwn ? "ring-1 ring-white/50" : "ring-1 ring-[var(--accent)]") : ""} ${isOwn ? "bg-white/10 hover:bg-white/20" : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]"}`}>
                {voted !== null && <div className={`absolute inset-y-0 left-0 transition-all ${isOwn ? "bg-white/10" : "bg-[var(--accent)]/10"}`} style={{ width: `${pct}%` }} />}
                <span className="relative">{opt}</span>
                {voted !== null && <span className={`relative float-right text-xs ${isOwn ? "text-white/60" : "text-[var(--text-tertiary)]"}`}>{pct}%</span>}
              </button>
            );
          })}
        </div>
        {!poll.isAnonymous && <p className={`mt-1.5 text-[10px] ${isOwn ? "text-white/40" : "text-[var(--text-tertiary)]"}`}>{totalVotes} votes</p>}
      </div>
    );
  } catch {
    return null;
  }
}

export default memo(function MessageBubble({ message, isOwn, isFirstInGroup, isLastInGroup }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { addReaction, setReplyingTo, pinMessage, deleteMessage } = useChatStore();

  const radiusOwn = `rounded-2xl ${isFirstInGroup ? "rounded-tr-sm" : ""} ${isLastInGroup ? "rounded-br-sm" : ""}`;
  const radiusOther = `rounded-2xl ${isFirstInGroup ? "rounded-tl-sm" : ""} ${isLastInGroup ? "rounded-bl-sm" : ""}`;

  const isMedia = message.type === "image" || message.type === "video" || message.type === "video_note" || message.type === "gif";
  const isVoice = message.type === "voice" || message.type === "audio";
  const isLocation = message.type === "location";
  const isPoll = message.type === "poll";
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div
      className={`group relative flex ${isOwn ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-0.5"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Action buttons */}
      {showActions && (
        <div className={`absolute top-0 z-10 flex items-center gap-0.5 animate-fade-in ${isOwn ? "right-[calc(100%_-_70%)] -translate-x-2" : "left-[calc(75%)] translate-x-2"}`}>
          <button onClick={() => setShowReactions(!showReactions)} className="rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="React">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <button onClick={() => setReplyingTo(message)} className="rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="Reply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
          </button>
          {isOwn && (
            <button onClick={() => deleteMessage(message.chatId, message.id)} className="rounded-lg bg-[var(--bg-card)] p-1.5 text-red-400 shadow-sm hover:bg-red-500/10" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
          <button onClick={() => pinMessage(message.chatId, message.id)} className="rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="Pin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>
          </button>
        </div>
      )}

      {/* Quick reactions popup */}
      {showReactions && (
        <div className={`absolute -top-10 z-20 flex gap-1 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in ${isOwn ? "right-4" : "left-4"}`}>
          {quickReactions.map((emoji) => (
            <button key={emoji} onClick={() => { addReaction(message.chatId, message.id, emoji); setShowReactions(false); }} className="rounded-lg p-1 text-lg transition-transform hover:scale-125 hover:bg-[var(--bg-hover)]">
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className={`max-w-[75%] ${isOwn ? `${radiusOwn} bg-[var(--bg-bubble-own)] text-white` : `${radiusOther} bg-[var(--bg-bubble-other)] text-[var(--text-primary)]`}`}>
        {/* Sender name for groups */}
        {!isOwn && isFirstInGroup && message.senderName && (
          <p className="px-3.5 pt-1.5 text-xs font-semibold text-[var(--accent)]">{message.senderName}</p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`mx-2 mt-2 rounded-lg border-l-2 px-2.5 py-1.5 ${isOwn ? "border-white/40 bg-white/10" : "border-[var(--accent)] bg-[var(--accent-soft)]"}`}>
            <p className={`text-[10px] font-semibold ${isOwn ? "text-white/70" : "text-[var(--accent)]"}`}>{message.replyTo.senderName}</p>
            <p className={`truncate text-xs ${isOwn ? "text-white/60" : "text-[var(--text-secondary)]"}`}>{message.replyTo.text}</p>
          </div>
        )}

        {/* Forwarded */}
        {message.isForwarded && (
          <p className={`px-3.5 pt-1.5 text-[10px] italic ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`}>Forwarded{message.forwardedFrom ? ` from ${message.forwardedFrom}` : ""}</p>
        )}

        {/* Media attachments */}
        {hasAttachments && (
          <div className={`${!isVoice ? "p-1" : ""}`}>
            {message.attachments!.map((att) => (
              <MediaContent key={att.id} attachment={att} isOwn={isOwn} />
            ))}
          </div>
        )}

        {/* Voice message without attachment — render waveform with text duration */}
        {isVoice && !hasAttachments && (
          <VoicePlayer attachment={{ id: "v", type: "voice", url: "", duration: parseInt(message.text.match(/\d+:\d+/)?.[0]?.split(":").reduce((a, b) => String(Number(a) * 60 + Number(b))) || "0") }} isOwn={isOwn} />
        )}

        {/* Location */}
        {isLocation && <LocationContent message={message} isOwn={isOwn} />}

        {/* Poll */}
        {isPoll && <PollContent message={message} isOwn={isOwn} />}

        {/* GIF inline */}
        {message.type === "gif" && !hasAttachments && message.text.startsWith("http") && (
          <div className="p-1">
            <img src={message.text} alt="GIF" className="max-h-[250px] rounded-lg" loading="lazy" />
          </div>
        )}

        {/* Message text — hide for pure media/voice */}
        {!isLocation && !isPoll && !(message.type === "gif" && message.text.startsWith("http")) && (
          <div className="px-3.5 py-1.5">
            {!(isVoice && !hasAttachments) && !(isMedia && hasAttachments && !message.text) && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.text}</p>
            )}

            {/* Translated text */}
            {message.translatedText && (
              <div className={`mt-1.5 border-t pt-1.5 ${isOwn ? "border-white/20" : "border-[var(--border)]"}`}>
                <p className={`text-[10px] ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`}>Translated</p>
                <p className="text-sm leading-relaxed">{message.translatedText}</p>
              </div>
            )}

            {/* Meta */}
            <div className={`mt-0.5 flex items-center justify-end gap-1 ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`}>
              {message.isEdited && <span className="text-[10px]">edited</span>}
              {message.isPinned && <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"/></svg>}
              <span className="text-[10px] leading-none">{message.timestamp}</span>
              {isOwn && <StatusIcon status={message.status} />}
            </div>
          </div>
        )}

        {/* Meta for media-only messages */}
        {(isMedia && hasAttachments || isLocation || isPoll || (message.type === "gif" && message.text.startsWith("http"))) && (
          <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`}>
            <span className="text-[10px] leading-none">{message.timestamp}</span>
            {isOwn && <StatusIcon status={message.status} />}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2 pb-2">
            {message.reactions.map((r) => (
              <button key={r.emoji} onClick={() => addReaction(message.chatId, message.id, r.emoji)} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${r.myReaction ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" : isOwn ? "bg-white/10 hover:bg-white/20" : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]"}`}>
                <span>{r.emoji}</span>
                <span className={r.myReaction ? "text-[var(--accent)]" : isOwn ? "text-white/70" : "text-[var(--text-secondary)]"}>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {message.threadRepliesCount && message.threadRepliesCount > 0 && (
          <button className={`flex items-center gap-1 px-3 pb-2 text-xs ${isOwn ? "text-white/60 hover:text-white/80" : "text-[var(--accent)] hover:text-[var(--accent-hover)]"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {message.threadRepliesCount} replies
          </button>
        )}
      </div>
    </div>
  );
});
