"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Send, SmilePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SavedSticker = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  fileName: string | null;
};

type StickerStudioProps = {
  currentUserId: string;
  disabled?: boolean;
  onSendSticker: (sticker: SavedSticker) => Promise<void>;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read sticker file."));
    };
    reader.onerror = () => reject(new Error("Failed to read sticker file."));
    reader.readAsDataURL(file);
  });

export const StickerStudio = ({
  currentUserId,
  disabled,
  onSendSticker,
}: StickerStudioProps) => {
  const [isOpen, setOpen] = useState(false);
  const [stickers, setStickers] = useState<SavedSticker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = useMemo(() => `tepla.stickers.${currentUserId}`, [currentUserId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setStickers([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedSticker[];
      setStickers(Array.isArray(parsed) ? parsed : []);
    } catch {
      setStickers([]);
    }
  }, [storageKey]);

  const persistStickers = (nextStickers: SavedSticker[]) => {
    setStickers(nextStickers);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextStickers));
    }
  };

  const handleAddSticker = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "sticker");
      formData.append("userId", currentUserId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let stickerUrl = "";
      let mimeType: string | null = file.type;
      let fileName: string | null = file.name;

      if (response.ok) {
        const upload = (await response.json()) as {
          url: string;
          mimeType: string;
          fileName: string;
        };
        stickerUrl = upload.url;
        mimeType = upload.mimeType;
        fileName = upload.fileName;
      } else {
        stickerUrl = await readFileAsDataUrl(file);
      }

      const nextSticker: SavedSticker = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        url: stickerUrl,
        mimeType,
        fileName,
      };

      persistStickers([nextSticker, ...stickers].slice(0, 30));
      event.target.value = "";
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to create sticker.",
      );
    }
  };

  const removeSticker = (stickerId: string) => {
    persistStickers(stickers.filter((sticker) => sticker.id !== stickerId));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={isOpen ? "Close sticker studio" : "Open sticker studio"}
          onClick={() => setOpen((current) => !current)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <SmilePlus className="h-4 w-4" />}
        </Button>
        {isOpen ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleAddSticker(event);
              }}
            />
            <Button
              type="button"
              variant="subtle"
              size="sm"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Add sticker
            </Button>
          </>
        ) : null}
      </div>

      {isOpen ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-sky-300">
                Sticker studio
              </p>
              <p className="mt-1 text-xs text-tepla-text-muted">
                Upload any image and send it as your own sticker.
              </p>
            </div>
            <span className="text-[11px] text-tepla-text-muted">{stickers.length}/30</span>
          </div>

          {stickers.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-2"
                >
                  <button
                    type="button"
                    className="group relative flex w-full flex-col items-center gap-2"
                    onClick={() => {
                      void onSendSticker(sticker);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <span className="truncate text-[10px] text-white/80">{sticker.name}</span>
                    <span className="absolute inset-x-1 bottom-6 hidden items-center justify-center rounded-full bg-black/70 px-2 py-1 text-[10px] text-white group-hover:flex">
                      <Send className="mr-1 h-3 w-3" />
                      Send
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-1 h-7 w-7"
                    onClick={() => removeSticker(sticker.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-tepla-text-muted">
              No custom stickers yet. Upload your first one.
            </div>
          )}

          {error ? <p className="mt-3 text-xs text-tepla-danger">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
