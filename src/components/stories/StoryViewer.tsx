"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type StoryItem = {
  id: string;
  mediaUrl: string;
  type: "photo" | "video";
  caption?: string;
  userId: string;
};

export type StoryViewerProps = {
  stories: StoryItem[];
  onClose: () => void;
};

export const StoryViewer = ({ stories, onClose }: StoryViewerProps) => {
  const [index, setIndex] = useState(0);
  const current = stories[index];

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  if (!current) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <div
        className="relative aspect-[9/16] max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full"
          >
            {current.type === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.mediaUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={current.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            )}
            {current.caption ? (
              <p className="absolute bottom-4 left-4 right-4 text-sm text-white drop-shadow-lg">
                {current.caption}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="absolute left-0 right-0 top-0 flex gap-1 p-2">
          {stories.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full bg-white/30"
            >
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: i < index ? "100%" : i === index ? "100%" : "0%" }}
                transition={{ duration: i === index ? 5 : 0 }}
              />
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={goPrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={goNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </motion.div>
  );
};
