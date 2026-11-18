import { create } from "zustand";

/** Which screen of the chat is showing. With no conversations yet, it is always the start form. */
type Screen = { name: "list" } | { name: "start" } | { name: "conversation"; id: string };

interface ChatState {
  screen: Screen;
  show: (screen: Screen) => void;
}

const initial: Screen = { name: "list" };

const useChatStore = create<ChatState>()((set) => ({
  screen: initial,
  show: (screen) => {
    set({ screen });
  },
}));

export const useScreen = () => useChatStore((state) => state.screen);
export const useShowScreen = () => useChatStore((state) => state.show);

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState({ screen: initial });
}
