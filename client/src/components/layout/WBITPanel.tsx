"use client";
import { useChatStore } from "@/stores/chat-store";
import WBITWalletScreen from "@/components/wbit/WBITWalletScreen";

export default function WBITPanel() {
  const { showWBIT, toggleWBIT } = useChatStore();

  if (!showWBIT) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/40" onClick={toggleWBIT} />
      <div className="relative ml-auto h-full w-full max-w-md bg-[var(--bg-main)] shadow-2xl animate-slide-in-right">
        <WBITWalletScreen onBack={toggleWBIT} />
      </div>
    </div>
  );
}
