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

/**
 * What the page around the chat asked a new conversation to begin with: a quick reply the
 * visitor tapped beside the launcher, or words for the message box.
 */
export interface PendingStart {
  reply?: string | undefined;
  draft?: string | undefined;
}

interface ChatState {
  screen: Screen;
  /** True in the dashboard's preview, where nothing is loaded and nothing is sent. */
  preview: boolean;
  setPreview: (preview: boolean) => void;
  page: HostPage | null;
  setPage: (page: HostPage) => void;
  /** Waiting for the start screen to use it, once. */
  pendingStart: PendingStart | null;
  setPendingStart: (start: PendingStart | null) => void;
  /** The tab a sub-screen was opened from, which is where its back arrow returns to. */
  tab: "home" | "messages";
  show: (screen: Screen) => void;
}

const initial = {
  screen: { name: "home" },
  tab: "home",
  page: null,
  preview: false,
  pendingStart: null,
} as const;

const useChatStore = create<ChatState>()((set) => ({
  ...initial,
  setPage: (page) => {
    set({ page });
  },
  setPendingStart: (pendingStart) => {
    set({ pendingStart });
  },
  setPreview: (preview) => {
    set({ preview });
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
export const useSetPreview = () => useChatStore((state) => state.setPreview);
export const usePreview = () => useChatStore((state) => state.preview);
export const usePendingStart = () => useChatStore((state) => state.pendingStart);
export const useSetPendingStart = () => useChatStore((state) => state.setPendingStart);
export const usePage = () => useChatStore((state) => state.page);
export const useSetPage = () => useChatStore((state) => state.setPage);

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState(initial);
}
