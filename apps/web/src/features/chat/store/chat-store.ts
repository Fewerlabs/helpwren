import { create } from "zustand";

/** Which screen of the chat is showing. Home and Messages are the two tabs. */
export type Screen =
  | { name: "home" }
  | { name: "messages" }
  | { name: "start" }
  | { name: "conversation"; id: string };

/** The page the chat is embedded in, as its widget script reported it. */
export interface HostPage {
  url: string;
  title: string;
}

interface ChatState {
  screen: Screen;
  page: HostPage | null;
  setPage: (page: HostPage) => void;
  /** The tab a sub-screen was opened from, which is where its back arrow returns to. */
  tab: "home" | "messages";
  show: (screen: Screen) => void;
}

const initial = { screen: { name: "home" }, tab: "home", page: null } as const;

const useChatStore = create<ChatState>()((set) => ({
  ...initial,
  setPage: (page) => {
    set({ page });
  },
  show: (screen) => {
    set(
      screen.name === "home" || screen.name === "messages"
        ? { screen, tab: screen.name }
        : { screen },
    );
  },
}));

export const useScreen = () => useChatStore((state) => state.screen);
export const useTab = () => useChatStore((state) => state.tab);
export const useShowScreen = () => useChatStore((state) => state.show);
export const usePage = () => useChatStore((state) => state.page);
export const useSetPage = () => useChatStore((state) => state.setPage);

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState(initial);
}
