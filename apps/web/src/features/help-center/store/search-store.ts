import { create } from "zustand";

interface SearchState {
  open: boolean;
  /** Words to start the search with, such as what was already typed into a box. */
  initial: string;
  show: (initial?: string) => void;
  hide: () => void;
}

/** Whether the help center's search window is open. Every search box on a page opens the one window. */
const useSearchStore = create<SearchState>()((set) => ({
  open: false,
  initial: "",
  show: (initial = "") => {
    set({ open: true, initial });
  },
  hide: () => {
    set({ open: false });
  },
}));

export const useSearchOpen = () => useSearchStore((state) => state.open);
export const useSearchInitial = () => useSearchStore((state) => state.initial);
export const useShowSearch = () => useSearchStore((state) => state.show);
export const useHideSearch = () => useSearchStore((state) => state.hide);
