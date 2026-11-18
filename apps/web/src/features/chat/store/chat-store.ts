import { create } from "zustand";

/** Which screen of the chat is showing. Home, Messages and Help are the tabs. */
export type Screen =
  | { name: "home" }
  | { name: "messages" }
  | { name: "help" }
  | { name: "start" }
  /** A help article, read without leaving the chat. */
  | { name: "article"; slug: string }
  | { name: "conversation"; id: string };

/** The page the chat is embedded in, as its widget script reported it. */
export interface HostPage {
  url: string;
  title: string;
}

interface ChatState {
  screen: Screen;
  /** True in the dashboard's preview, where nothing is loaded and nothing is sent. */
  preview: boolean;
  setPreview: (preview: boolean) => void;
  page: HostPage | null;
  setPage: (page: HostPage) => void;
  /** A quick reply tapped beside the launcher, waiting for the start screen to use it. */
  pendingReply: string | null;
  setPendingReply: (reply: string | null) => void;
  /** The tab a sub-screen was opened from, which is where its back arrow returns to. */
  tab: "home" | "messages" | "help";
  show: (screen: Screen) => void;
}

const initial = {
  screen: { name: "home" },
  tab: "home",
  page: null,
  preview: false,
  pendingReply: null,
} as const;

const useChatStore = create<ChatState>()((set) => ({
  ...initial,
  setPage: (page) => {
    set({ page });
  },
  setPendingReply: (pendingReply) => {
    set({ pendingReply });
  },
  setPreview: (preview) => {
    set({ preview });
  },
  show: (screen) => {
    set(
      screen.name === "home" || screen.name === "messages" || screen.name === "help"
        ? { screen, tab: screen.name }
        : { screen },
    );
  },
}));

export const useScreen = () => useChatStore((state) => state.screen);
export const useTab = () => useChatStore((state) => state.tab);
export const useShowScreen = () => useChatStore((state) => state.show);
export const useSetPreview = () => useChatStore((state) => state.setPreview);
export const usePreview = () => useChatStore((state) => state.preview);
export const usePendingReply = () => useChatStore((state) => state.pendingReply);
export const useSetPendingReply = () => useChatStore((state) => state.setPendingReply);
export const usePage = () => useChatStore((state) => state.page);
export const useSetPage = () => useChatStore((state) => state.setPage);

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState(initial);
}
