import { create } from 'zustand';

interface UIState {
  connectWalletOpen: boolean;
  wrongNetworkOpen: boolean;
  setConnectWalletOpen: (open: boolean) => void;
  setWrongNetworkOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  connectWalletOpen: false,
  wrongNetworkOpen: false,
  setConnectWalletOpen: (open) => set({ connectWalletOpen: open }),
  setWrongNetworkOpen: (open) => set({ wrongNetworkOpen: open })
}));
export default useUIStore;
