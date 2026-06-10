"use client";
import { useChatStore } from "@/stores/chat-store";
import WalletScreen from "@/components/wallet/WalletScreen";

export default function WalletPanel() {
  const { showWallet, toggleWallet } = useChatStore();

  if (!showWallet) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={toggleWallet} />
      {/* Panel */}
      <div className="relative ml-auto h-full w-full max-w-md bg-[var(--bg-main)] shadow-2xl animate-slide-in-right">
        <WalletScreen onBack={toggleWallet} />
      </div>
    </div>
  );
}
