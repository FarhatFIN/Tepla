import { create } from "zustand";
import type { SparksTransaction, SparksWallet } from "@/types/sparks";

type SparksState = {
  wallet: SparksWallet | null;
  transactions: SparksTransaction[];
  setWalletState: (payload: {
    wallet: SparksWallet;
    transactions?: SparksTransaction[];
  }) => void;
  setBalance: (balance: number) => void;
  clearWallet: () => void;
};

export const useSparksStore = create<SparksState>((set) => ({
  wallet: null,
  transactions: [],
  setWalletState: (payload) =>
    set((state) => ({
      wallet: payload.wallet,
      transactions: payload.transactions ?? state.transactions,
    })),
  setBalance: (balance) =>
    set((state) => ({
      wallet: state.wallet
        ? {
            ...state.wallet,
            balance,
          }
        : null,
    })),
  clearWallet: () =>
    set({
      wallet: null,
      transactions: [],
    }),
}));
