import { create } from "zustand";

interface UiStore {
  closeAllPopupsTick: number;
  closeAllPopups: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  closeAllPopupsTick: 0,
  closeAllPopups: () =>
    set((state) => ({ closeAllPopupsTick: state.closeAllPopupsTick + 1 })),
}));