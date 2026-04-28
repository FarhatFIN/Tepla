"use client";
import { useEffect, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import api from "@/lib/api";

type StickerApi = {
  id: string;
  packId?: string;
  emoji?: string;
  fileUrl?: string;
  thumbnailUrl?: string | null;
  width?: number;
  height?: number;
  isAnimated?: boolean;
};

type StickerPackApi = {
  id: string;
  stickers?: StickerApi[];
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const emojiCategories = [
  { name: "Smileys", emojis: ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F602}", "\u{1F923}", "\u{1F60A}", "\u{1F607}", "\u{1F642}", "\u{1F643}", "\u{1F609}", "\u{1F60C}", "\u{1F60D}", "\u{1F970}", "\u{1F618}", "\u{1F617}", "\u{1F619}", "\u{1F61A}", "\u{1F60B}", "\u{1F61B}", "\u{1F61C}", "\u{1F61D}", "\u{1F911}", "\u{1F917}", "\u{1F914}", "\u{1F910}", "\u{1F928}", "\u{1F610}", "\u{1F611}", "\u{1F636}", "\u{1F60F}", "\u{1F612}", "\u{1F644}", "\u{1F62C}", "\u{1F925}"] },
  { name: "Gestures", emojis: ["\u{1F44D}", "\u{1F44E}", "\u{1F44A}", "\u{270A}", "\u{1F91B}", "\u{1F91C}", "\u{1F44F}", "\u{1F64C}", "\u{1F450}", "\u{1F64F}", "\u{1F91D}", "\u{1F4AA}", "\u{270C}\u{FE0F}", "\u{1F918}", "\u{1F44C}", "\u{1F448}", "\u{1F449}", "\u{1F446}", "\u{1F447}", "\u{261D}\u{FE0F}", "\u{270B}", "\u{1F91A}", "\u{1F596}", "\u{1F44B}"] },
  { name: "Hearts", emojis: ["\u{2764}\u{FE0F}", "\u{1F9E1}", "\u{1F49B}", "\u{1F49A}", "\u{1F499}", "\u{1F49C}", "\u{1F5A4}", "\u{1F90D}", "\u{1F90E}", "\u{1F498}", "\u{1F49D}", "\u{1F496}", "\u{1F497}", "\u{1F493}", "\u{1F49E}", "\u{1F495}", "\u{1F48C}"] },
  { name: "Objects", emojis: ["\u{1F525}", "\u{2B50}", "\u{1F31F}", "\u{2728}", "\u{1F4A5}", "\u{1F389}", "\u{1F38A}", "\u{1F3B5}", "\u{1F3B6}", "\u{1F680}", "\u{1F4AF}", "\u{26A1}", "\u{1F308}", "\u{2600}\u{FE0F}", "\u{1F319}", "\u{1F4A1}", "\u{1F48E}", "\u{1F451}", "\u{1F947}", "\u{1F3C6}", "\u{26BD}", "\u{1F3AE}", "\u{1F3B2}", "\u{1F4F1}"] },
  { name: "Food", emojis: ["\u{1F34E}", "\u{1F34F}", "\u{1F350}", "\u{1F34A}", "\u{1F34B}", "\u{1F34C}", "\u{1F349}", "\u{1F347}", "\u{1F353}", "\u{1F348}", "\u{1F352}", "\u{1F351}", "\u{1F346}", "\u{1F955}", "\u{1F33D}", "\u{1F336}\u{FE0F}", "\u{1F951}", "\u{1F966}", "\u{1F355}", "\u{1F354}", "\u{1F32E}", "\u{1F37F}", "\u{2615}", "\u{1F37A}", "\u{1F377}"] },
];

export default function StickerPicker() {
  const { showStickers, toggleStickers, activeChatId, sendMessage } = useChatStore();
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [searchEmoji, setSearchEmoji] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [stickers, setStickers] = useState<StickerApi[]>([]);
  const [isLoadingStickers, setIsLoadingStickers] = useState(false);
  const [stickerError, setStickerError] = useState<string | null>(null);

  const query = searchEmoji.trim();

  useEffect(() => {
    if (!showStickers || tab !== "stickers") return;

    let alive = true;

    const loadStickers = async () => {
      setIsLoadingStickers(true);
      setStickerError(null);

      try {
        const path = query
          ? `/stickers/search?q=${encodeURIComponent(query)}`
          : "/stickers/trending";
        const response = await api.get<ApiResponse<StickerPackApi[]>>(path);
        const next = (response.data || []).flatMap((pack) => pack.stickers || []);
        if (alive) setStickers(next);
      } catch (error) {
        if (alive) {
          setStickers([]);
          setStickerError(error instanceof Error ? error.message : "Unable to load stickers");
        }
      } finally {
        if (alive) setIsLoadingStickers(false);
      }
    };

    void loadStickers();

    return () => {
      alive = false;
    };
  }, [query, showStickers, tab]);

  if (!showStickers || !activeChatId) return null;

  const handleEmojiClick = (emoji: string) => {
    sendMessage(activeChatId, emoji);
    toggleStickers();
  };

  const handleStickerClick = (sticker: StickerApi) => {
    const url = sticker.fileUrl || sticker.thumbnailUrl;
    if (!url) return;

    sendMessage(activeChatId, sticker.emoji || "Sticker", "sticker", [
      {
        id: sticker.id,
        type: "sticker",
        url,
        thumbnailUrl: sticker.thumbnailUrl || url,
        fileName: `sticker-${sticker.id}`,
        mimeType: sticker.isAnimated ? "image/gif" : "image/webp",
        width: sticker.width,
        height: sticker.height,
      },
    ]);
    void api.post(`/stickers/${sticker.id}/use`).catch(() => undefined);
    toggleStickers();
  };

  const emojiList = emojiCategories[activeCategory]?.emojis || [];
  const visibleEmojis = query ? emojiList.filter((emoji) => emoji.includes(query)) : emojiList;

  return (
    <div className="absolute bottom-16 right-4 z-30 w-[340px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl animate-scale-in">
      <div className="flex border-b border-[var(--border)]">
        {(["emoji", "stickers"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${tab === item ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>
            {item}
          </button>
        ))}
        <button onClick={toggleStickers} className="px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="px-3 py-2">
        <input value={searchEmoji} onChange={(e) => setSearchEmoji(e.target.value)} placeholder={`Search ${tab}...`} className="w-full rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" />
      </div>

      {tab === "emoji" && (
        <>
          <div className="flex gap-1 px-3 pb-1">
            {emojiCategories.map((cat, index) => (
              <button key={cat.name} onClick={() => setActiveCategory(index)} className={`rounded-md px-2 py-1 text-[10px] transition-colors ${activeCategory === index ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"}`}>
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          <div className="grid max-h-[250px] grid-cols-8 gap-0.5 overflow-y-auto px-2 pb-2">
            {visibleEmojis.map((emoji) => (
              <button key={emoji} onClick={() => handleEmojiClick(emoji)} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-[var(--bg-hover)]">
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "stickers" && (
        <div className="grid max-h-[280px] grid-cols-4 gap-2 overflow-y-auto p-3">
          {isLoadingStickers ? (
            <div className="col-span-4 py-8 text-center text-sm text-[var(--text-tertiary)]">Loading stickers...</div>
          ) : stickerError ? (
            <div className="col-span-4 py-8 text-center text-sm text-[var(--text-tertiary)]">{stickerError}</div>
          ) : stickers.length > 0 ? (
            stickers.map((sticker) => {
              const url = sticker.thumbnailUrl || sticker.fileUrl;
              return (
                <button key={sticker.id} onClick={() => handleStickerClick(sticker)} className="flex h-16 items-center justify-center overflow-hidden rounded-xl bg-[var(--bg-input)] transition-transform hover:scale-105 hover:bg-[var(--bg-hover)]">
                  {url ? <img src={url} alt={sticker.emoji || "Sticker"} className="h-full w-full object-contain p-1" loading="lazy" /> : <span className="text-3xl">{sticker.emoji}</span>}
                </button>
              );
            })
          ) : (
            <div className="col-span-4 py-8 text-center text-sm text-[var(--text-tertiary)]">No stickers found</div>
          )}
        </div>
      )}
    </div>
  );
}