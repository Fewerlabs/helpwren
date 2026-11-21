import { type ArticleFilter, type PageContext } from "@helpwren/core";
import { create } from "zustand";

/** Which screen of the chat is showing. Home, Messages and Help are the tabs. */
export type Screen =
  | { name: "home" }
  | { name: "messages" }
  | { name: "help" }
  | { name: "start" }
  /** One collection of help articles, opened from the Help tab. */
  | { name: "collection"; collection: OpenCollection }
  /** A help article, read without leaving the chat. `from` is the collection it was opened in. */
  | { name: "article"; slug: string; from?: OpenCollection }
  /** The form for opening a ticket, in place of a chat. */
  | { name: "ticket" }
  | { name: "conversation"; id: string };

/** The collection a visitor is looking through: enough to name it and list its articles. */
export interface OpenCollection {
  id: string;
  name: string;
}

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

/**
 * The widget's panel, as its script reports it: whether it can grow to a reading size (a
 * floating panel on a wide screen), and whether it has.
 */
export interface PanelLayout {
  expandable: boolean;
  expanded: boolean;
}

/** Who the page says the visitor is, without proof. Labels for the team, and nothing more. */
export interface ClaimedIdentity {
  id?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
}

interface ChatState {
  screen: Screen;
  /** True in the dashboard's preview, where nothing is loaded and nothing is sent. */
  preview: boolean;
  setPreview: (preview: boolean) => void;
  page: HostPage | null;
  setPage: (page: HostPage) => void;
  /** Where the visitor came to the host page from, when its widget script said. */
  referrer: string | null;
  setReferrer: (referrer: string | null) => void;
  /** Whether the host page's tab is showing. The chat checks in only while it is. */
  hostVisible: boolean;
  setHostVisible: (visible: boolean) => void;
  /**
   * Whether the chat itself is open: false while the widget's panel is closed. The chat says
   * whether the team is online, which holds a connection open, only while it is.
   */
  showing: boolean;
  setShowing: (showing: boolean) => void;
  /** The widget's panel. Nothing grows until its script says it can. */
  panelLayout: PanelLayout;
  setPanelLayout: (layout: PanelLayout) => void;
  claimed: ClaimedIdentity | null;
  setClaimed: (claimed: ClaimedIdentity | null) => void;
  /** What the page wants the team to know about where the visitor is. */
  context: PageContext | null;
  setContext: (context: PageContext | null) => void;
  /** The filter the page set for its help articles, which wins over the team's rules. */
  helpFilter: ArticleFilter | null;
  setHelpFilter: (filter: ArticleFilter | null) => void;
  /** Waiting for the start screen to use it, once. */
  pendingStart: PendingStart | null;
  setPendingStart: (start: PendingStart | null) => void;
  /** The tab a sub-screen was opened from, which is where its back arrow returns to. */
  tab: "home" | "messages" | "help";
  show: (screen: Screen) => void;
}

const initial = {
  screen: { name: "home" },
  tab: "home",
  page: null,
  referrer: null,
  hostVisible: true,
  showing: true,
  panelLayout: { expandable: false, expanded: false },
  preview: false,
  pendingStart: null,
  claimed: null,
  context: null,
  helpFilter: null,
} as const;

const useChatStore = create<ChatState>()((set) => ({
  ...initial,
  setPage: (page) => {
    set({ page });
  },
  setReferrer: (referrer) => {
    set({ referrer });
  },
  setHostVisible: (hostVisible) => {
    set({ hostVisible });
  },
  setShowing: (showing) => {
    set({ showing });
  },
  setPanelLayout: (panelLayout) => {
    set({ panelLayout });
  },
  setClaimed: (claimed) => {
    set({ claimed });
  },
  setContext: (context) => {
    set({ context });
  },
  setHelpFilter: (helpFilter) => {
    set({ helpFilter });
  },
  setPendingStart: (pendingStart) => {
    set({ pendingStart });
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
export const usePendingStart = () => useChatStore((state) => state.pendingStart);
export const useSetPendingStart = () => useChatStore((state) => state.setPendingStart);
export const useClaimed = () => useChatStore((state) => state.claimed);
export const useSetClaimed = () => useChatStore((state) => state.setClaimed);
export const usePageContext = () => useChatStore((state) => state.context);
export const useSetPageContext = () => useChatStore((state) => state.setContext);
export const useHelpFilter = () => useChatStore((state) => state.helpFilter);
export const useSetHelpFilter = () => useChatStore((state) => state.setHelpFilter);
export const usePage = () => useChatStore((state) => state.page);
export const useSetPage = () => useChatStore((state) => state.setPage);
export const useReferrer = () => useChatStore((state) => state.referrer);
export const useSetReferrer = () => useChatStore((state) => state.setReferrer);
export const useHostVisible = () => useChatStore((state) => state.hostVisible);
export const useSetHostVisible = () => useChatStore((state) => state.setHostVisible);
export const useShowing = () => useChatStore((state) => state.showing);
export const useSetShowing = () => useChatStore((state) => state.setShowing);
export const usePanelLayout = () => useChatStore((state) => state.panelLayout);
export const useSetPanelLayout = () => useChatStore((state) => state.setPanelLayout);

/** For tests: puts the store back to its starting state. */
export function resetChatStore() {
  useChatStore.setState(initial);
}
