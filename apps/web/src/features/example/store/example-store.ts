import { create } from "zustand";

/**
 * Client state for this feature only: what the person has typed and opened.
 * Data from the server is not kept here; TanStack Query caches that.
 */
interface ExampleState {
  search: string;
  composerOpen: boolean;
  setSearch: (search: string) => void;
  setComposerOpen: (open: boolean) => void;
}

const useExampleStore = create<ExampleState>()((set) => ({
  search: "",
  composerOpen: false,
  setSearch: (search) => {
    set({ search });
  },
  setComposerOpen: (composerOpen) => {
    set({ composerOpen });
  },
}));

// Components read through selectors, so each one re-renders only for the value it uses.
export const useSearch = () => useExampleStore((state) => state.search);
export const useSetSearch = () => useExampleStore((state) => state.setSearch);
export const useComposerOpen = () => useExampleStore((state) => state.composerOpen);
export const useSetComposerOpen = () => useExampleStore((state) => state.setComposerOpen);

/** Puts the store back to its starting state. For tests. */
export function resetExampleStore(): void {
  useExampleStore.setState({ search: "", composerOpen: false });
}
