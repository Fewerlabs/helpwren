import { create } from "zustand";

/** Which screen of the chat is showing. Home and Messages are the two tabs. */
export type Screen =
  | { name: "home" }
  | { name: "messages" }
  | { name: "start" }
  | { name: "conversation"; id: string };

interface ChatState {
  screen: Screen;
  /** The tab a sub-screen was opened from, which is where its back arrow returns to. */
  tab: "home" | "messages";
  show: (screen: Screen) => void;
}

const initial = { screen: { name: "home" }, tab: "home" } as const;

const useChatStore = create<ChatState>()((set) => ({
  ...initial,
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

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState(initial);
}
