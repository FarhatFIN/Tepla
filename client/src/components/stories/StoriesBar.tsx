"use client";
import { UserStories } from "@/types";
import Avatar from "@/components/ui/Avatar";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useChatStore } from "@/stores/chat-store";

interface StoriesBarProps {
  stories: UserStories[];
}

export default function StoriesBar({ stories }: StoriesBarProps) {
  const [viewingStory, setViewingStory] = useState<UserStories | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const viewStory = useChatStore((s) => s.viewStory);

  const openStory = (us: UserStories) => {
    setViewingStory(us);
    setStoryIndex(0);
    if (us.stories[0] && !us.stories[0].isViewed) viewStory(us.stories[0].id);
  };

  const nextStory = () => {
    if (!viewingStory) return;
    if (storyIndex < viewingStory.stories.length - 1) {
      const nextIdx = storyIndex + 1;
      setStoryIndex(nextIdx);
      if (!viewingStory.stories[nextIdx].isViewed) viewStory(viewingStory.stories[nextIdx].id);
    } else {
      const currentUserIdx = stories.findIndex((s) => s.userId === viewingStory.userId);
      if (currentUserIdx < stories.length - 1) {
        const nextUser = stories[currentUserIdx + 1];
        setViewingStory(nextUser);
        setStoryIndex(0);
        if (!nextUser.stories[0].isViewed) viewStory(nextUser.stories[0].id);
      } else { setViewingStory(null); }
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-none">
        {/* Add story button */}
        <button className="flex shrink-0 flex-col items-center gap-1" onClick={() => openStory(stories[0])}>
          <div className="relative">
            <Avatar name={stories[0]?.userName || "+"} size="lg" showStatus={false} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-bold text-white ring-2 ring-[var(--bg-sidebar)]">+</span>
          </div>
          <span className="max-w-[56px] truncate text-[10px] text-[var(--text-tertiary)]">My</span>
        </button>

        {stories.filter((s) => s.userId !== "me").map((us) => (
          <button key={us.userId} className="flex shrink-0 flex-col items-center gap-1" onClick={() => openStory(us)}>
            <Avatar name={us.userName} src={us.userAvatar} size="lg" showStatus={false} storyRing storyViewed={!us.hasUnviewed} />
            <span className="max-w-[56px] truncate text-[10px] text-[var(--text-tertiary)]">{us.userName}</span>
          </button>
        ))}
      </div>

      {/* Story viewer */}
      <Modal open={!!viewingStory} onClose={() => setViewingStory(null)} size="sm">
        {viewingStory && viewingStory.stories[storyIndex] && (
          <div className="flex flex-col items-center">
            {/* Progress bars */}
            <div className="mb-4 flex w-full gap-1">
              {viewingStory.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full bg-white/20">
                  <div className={`h-full rounded-full bg-white transition-all ${i <= storyIndex ? "w-full" : "w-0"}`} />
                </div>
              ))}
            </div>
            <div className="mb-3 flex items-center gap-2 self-start">
              <Avatar name={viewingStory.userName} size="sm" showStatus={false} />
              <span className="text-sm font-medium">{viewingStory.userName}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{viewingStory.stories[storyIndex].createdAt}</span>
            </div>
            <div
              className="flex h-[400px] w-full items-center justify-center rounded-xl text-xl font-bold text-white cursor-pointer"
              style={{ background: viewingStory.stories[storyIndex].backgroundColor || "#0ea5e9" }}
              onClick={nextStory}
            >
              {viewingStory.stories[storyIndex].text}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {viewingStory.stories[storyIndex].viewsCount}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
