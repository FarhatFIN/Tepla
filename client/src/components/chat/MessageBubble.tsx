"use client";
import { memo, useState } from "react";
import { Message, MessageStatus } from "@/types";
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

export default memo(function MessageBubble({ message, isOwn, isFirstInGroup, isLastInGroup }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { addReaction, setReplyingTo, pinMessage, deleteMessage } = useChatStore();

  const radiusOwn = `rounded-2xl ${isFirstInGroup ? "rounded-tr-sm" : ""} ${isLastInGroup ? "rounded-br-sm" : ""}`;
  const radiusOther = `rounded-2xl ${isFirstInGroup ? "rounded-tl-sm" : ""} ${isLastInGroup ? "rounded-bl-sm" : ""}`;

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

        {/* Message text */}
        <div className="px-3.5 py-1.5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.text}</p>

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
