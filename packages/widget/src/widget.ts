import { defaultAppearance, parseAppearance, type Appearance } from "./appearance";
import { createHelpEmbed, type HelpEmbedOptions } from "./help-embed";
import {
  CHANNEL,
  isFrameMessage,
  type ArticleFilter,
  type HelpArticle,
  type IdentityState,
  type LatestUnread,
  type PageContext,
  type PageMessage,
  type VisitorDetails,
} from "./protocol";
import { closeIcon, dismissIcon, openIcon, styles, wrenIcon } from "./styles";

export type { Appearance } from "./appearance";
export { createHelpEmbed, helpEmbedUrl } from "./help-embed";
export type { HelpEmbedOptions, HelpEmbedPart } from "./help-embed";
export type {
  ArticleFilter,
  HelpArticle,
  IdentityState,
  PageContext,
  VisitorDetails,
} from "./protocol";

/**
 * What `setContext` takes: plain values for the team, such as `{ plan: "pro" }`, and `filter`,
 * which picks the help articles shown for this page.
 */
export type WidgetContext = { filter?: ArticleFilter } & Record<
  string,
  PageContext[string] | ArticleFilter | undefined
>;

/**
 * Who the visitor is. A `token` proves it: the install checks it and signs them in as that
 * user, with their history from every device. Give a function when you can, so a fresh token
 * can be fetched if one expires. Without a token, `id`, `name` and `email` are labels for the
 * team and nothing more; the visitor stays a guest.
 */
export type Identity =
  { token: string | (() => string | Promise<string>) } | (VisitorDetails & { token?: undefined });

export interface InitOptions {
  /** Where this page is, as one of the install's sources. Default `web`. */
  source?: string;
  /**
   * Whether to show the round launcher button. Turn it off to open the chat from your own
   * button with `Helpwren.show()`. Default true.
   */
  launcher?: boolean;
  /**
   * Your own buttons or links that open and close the chat: elements, or a CSS selector for
   * them. Each is given `aria-expanded`, kept in step with the chat.
   */
  trigger?: string | Element | readonly Element[];
  /**
   * Where to put the widget, in place of the whole page: an element, or a CSS selector for
   * one. With `mode: "inline"` the chat fills it; otherwise the launcher and panel float
   * inside it, and it must be positioned.
   */
  container?: HTMLElement | string;
  /**
   * `floating` is a launcher in the corner that opens a panel (default). `inline` puts the chat
   * straight into `container`, always open, as large as the container down to a smallest
   * usable size, with no launcher: for a support page or a panel of your own.
   */
  mode?: "floating" | "inline";
  /**
   * Your own choices for how the widget looks, over the install's settings: `position`,
   * `offsetX`, `offsetY`, `accent`, `accentTo`, `accentInk` and `launcher`.
   */
  appearance?: Partial<Appearance>;
  /** Layout the install's settings do not cover. */
  layout?: WidgetLayout;
  /** Whether the welcome message may show beside the launcher. Default true. */
  welcome?: boolean;
  /** How the widget looks, in place of asking the install. Also starts it as a preview. */
  preview?: WidgetPreview;
  /** Whether the chat starts open. Default false. */
  open?: boolean;
}

/** What a preview shows in place of the install's saved settings. Nothing in one is sent. */
export interface WidgetPreview {
  appearance?: Partial<Appearance>;
  /** The chat's own settings. Passed to the chat frame, which checks them. */
  settings?: unknown;
}

/** Sizes and stacking for the floating panel. Each is clamped to a sensible range. */
export interface WidgetLayout {
  /** The panel's width in pixels, from 320 to 640. Default 400. */
  width?: number;
  /** The panel's height in pixels, from 420 to 900. Default 680. */
  height?: number;
  /** The widget's `z-index`, for a page with layers of its own. */
  zIndex?: number;
}

export interface HelpwrenEvents {
  /** The chat has loaded and is ready to be shown. */
  ready: () => void;
  /** The chat was opened, by the visitor or by you. */
  open: () => void;
  /** The chat was closed. */
  close: () => void;
  /** The number of unread messages changed. Use it for a badge on your own button. */
  unread: (count: number) => void;
  /** The chat signed in as your user, went back to a guest, or could not be signed in. */
  identity: (identity: IdentityState) => void;
}

export interface HelpwrenWidget {
  /** Adds the chat to the page. Safe to call more than once; later calls do nothing. */
  init: (options?: InitOptions) => void;
  /** Opens the chat panel. */
  show: () => void;
  /** Closes the chat panel. */
  hide: () => void;
  /** Opens the chat if it is closed, and closes it if it is open. */
  toggle: () => void;
  /** Whether the chat is open now. */
  isOpen: () => boolean;
  /**
   * Opens the chat on a new conversation. `draft` is put in the message box for the visitor to
   * send or change; nothing is sent for them.
   */
  startConversation: (draft?: string) => void;
  /**
   * Says who the visitor is. Call it straight after `init` on pages where someone is logged in,
   * and again when they log in. It may be called before `init`.
   */
  identify: (identity: Identity) => void;
  /** Forgets who the visitor is. Call it when they log out. */
  reset: () => void;
  /**
   * Tells the team about where the visitor is, such as the plan they are on or the order they
   * are looking at. It is sent with the next conversation they start, and replaces what was set.
   * `filter` picks the help articles the chat shows for this page, in place of the team's rules.
   */
  setContext: (context: WidgetContext) => void;
  /**
   * The published help articles a filter picks, for a list of your own. Asks the install's
   * `POST /api/articles/search`, which only the allowed domains' pages may read.
   */
  findArticles: (filter: ArticleFilter) => Promise<HelpArticle[]>;
  /** Opens the chat on one help article, by its slug. */
  openArticle: (slug: string) => void;
  /** Changes how the widget looks or is laid out after `init`. */
  update: (changes: { appearance?: Partial<Appearance>; layout?: WidgetLayout }) => void;
  /** Listens for an event. Returns a function that stops listening. */
  on: <Event extends keyof HelpwrenEvents>(
    event: Event,
    listener: HelpwrenEvents[Event],
  ) => () => void;
  /** Changes what a widget started as a preview shows. */
  preview: (preview: WidgetPreview) => void;
  /** Takes the widget off the page. `init` can add it again. */
  destroy: () => void;
  /**
   * Puts the help center in a frame inside `container`, sized to what it shows, with only the
   * parts you keep. Needs no `init`. Returns a function that takes it away.
   */
  embedHelp: (container: HTMLElement, options?: HelpEmbedOptions) => () => void;
}

interface Teaser {
  box: HTMLDivElement;
  avatar: HTMLSpanElement;
  name: HTMLSpanElement;
  message: HTMLSpanElement;
  replies: HTMLDivElement;
}

/** Marks an element the widget fills with help articles. Its value is a filter, as JSON. */
const HELP_ATTRIBUTE = "data-helpwren-help";

function isHelpArticle(data: unknown): data is HelpArticle {
  if (typeof data !== "object" || data === null) return false;
  const article = data as Record<string, unknown>;
  return (
    typeof article.title === "string" &&
    typeof article.slug === "string" &&
    (article.summary === null || typeof article.summary === "string") &&
    (article.url === null || (typeof article.url === "string" && /^https?:\/\//.test(article.url)))
  );
}

/**
 * A screen the panel floats on, rather than covering. Keep in step with the full-screen rule in
 * `styles.ts`, `(max-width: 640px), (max-height: 480px)`, of which this is the opposite.
 */
const FLOATING_SCREEN = "(min-width: 641px) and (min-height: 481px)";

/** Remembers, for this visit, that the welcome message has been seen or dismissed. */
const TEASER_SEEN = "helpwren.welcome-seen";

/** Tells one reply from another: a new message in the same conversation is a new reply. */
const replyKey = (reply: LatestUnread) => `${reply.conversationId}:${reply.preview}`;

interface Mounted {
  host: HTMLElement;
  teaser: Teaser | undefined;
  launcher: HTMLButtonElement | undefined;
  badge: HTMLSpanElement | undefined;
  panel: HTMLDivElement;
  frame: HTMLIFrameElement;
}

/**
 * Creates the widget for a Helpwren install at `appOrigin`, such as
 * `https://support.example.com`. Nothing is added to the page until `init` is called.
 */
export function createWidget(appOrigin: string): HelpwrenWidget {
  const listeners: { [Event in keyof HelpwrenEvents]: Set<HelpwrenEvents[Event]> } = {
    ready: new Set(),
    open: new Set(),
    close: new Set(),
    unread: new Set(),
    identity: new Set(),
  };
  // Who the page says the visitor is, kept so it can be said again each time the frame loads.
  let identity: Identity | undefined;
  let context: PageContext | undefined;
  let filter: ArticleFilter | undefined;
  // A fresh token is fetched once when one expires, not over and over.
  let retriedToken = false;
  // What the host page asked for, kept so it still applies after the install's settings load.
  let overrides: Partial<Appearance> = {};
  let triggers: Element[] = [];
  let inline = false;
  let showWelcome = true;
  let mounted: Mounted | undefined;
  let unread = 0;
  let appearance = defaultAppearance;
  let previewSettings: unknown;
  let previewing = false;
  let teaserSeen = false;
  let frameReady = false;
  // A screen the page asked for before the chat was ready to show it.
  let waiting: PageMessage | undefined;
  // The newest unread reply, shown beside the launcher in place of the welcome message.
  let latest: LatestUnread | undefined;
  // The reply the visitor waved away. A newer one shows again.
  let dismissedReply: string | undefined;
  let stopWatchingPage: (() => void) | undefined;
  // Whether the panel is at its reading size, and the screen size that allows it.
  let expanded = false;
  let floatingScreen: MediaQueryList | undefined;

  /** Whether the visitor has already seen or dismissed the welcome message on this visit. */
  function readTeaserSeen(): boolean {
    try {
      return window.sessionStorage.getItem(TEASER_SEEN) === "1";
    } catch {
      return false;
    }
  }

  function markTeaserSeen() {
    teaserSeen = true;
    if (previewing) return;
    try {
      window.sessionStorage.setItem(TEASER_SEEN, "1");
    } catch {
      // Storage is blocked: it is remembered until the page is left, which is enough.
    }
  }

  /**
   * Opens the chat on a new conversation: with the quick reply the visitor tapped, which is
   * sent for them, or with a draft from the page, which is only put in the message box.
   */
  function startConversation(start: { reply?: string; draft?: string } = {}) {
    showScreen({ channel: CHANNEL, type: "start", ...start });
  }

  /** Opens the chat on a screen: sent now if the chat is ready, or as soon as it is. */
  function showScreen(message: PageMessage) {
    if (!mounted) return;
    if (frameReady) mounted.frame.contentWindow?.postMessage(message, appOrigin);
    else waiting = message;
    setOpen(true);
  }

  async function findArticles(wanted: ArticleFilter): Promise<HelpArticle[]> {
    const response = await fetch(new URL("/api/articles/search", appOrigin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filter: wanted }),
    });
    if (!response.ok) {
      throw new Error(`Helpwren: the articles could not be loaded (${String(response.status)}).`);
    }
    const answer: unknown = await response.json();
    return Array.isArray(answer) ? answer.filter(isHelpArticle) : [];
  }

  // Each inline list, and the filter it was last filled for.
  const filled = new WeakMap<HTMLElement, string>();
  let stopWatchingHelp: (() => void) | undefined;

  /**
   * Fills an element marked `data-helpwren-help='{"tags":{"any":["refunds"]}}'` with links to
   * the articles its filter picks. Nothing is drawn while they load, and nothing when there
   * are none, so the page moves only by the list itself. A link opens the article in the chat,
   * or the help center's page when the chat is not on the page.
   */
  function fillHelp(element: HTMLElement) {
    const raw = element.getAttribute(HELP_ATTRIBUTE) ?? "";
    if (filled.get(element) === raw) return;
    filled.set(element, raw);
    let wanted: unknown;
    try {
      wanted = JSON.parse(raw || "{}");
    } catch {
      wanted = undefined;
    }
    if (typeof wanted !== "object" || wanted === null || Array.isArray(wanted)) {
      element.dataset.helpwrenState = "error";
      console.error("Helpwren: data-helpwren-help holds a filter written as JSON.", element);
      return;
    }
    element.dataset.helpwrenState = "loading";
    element.setAttribute("aria-busy", "true");
    findArticles(wanted)
      .then((articles) => {
        // The filter changed while these were on their way.
        if (filled.get(element) !== raw) return;
        element.dataset.helpwrenState = articles.length > 0 ? "ready" : "empty";
        element.querySelector(":scope > .helpwren-help-list")?.remove();
        if (articles.length > 0) element.append(helpList(articles));
      })
      .catch(() => {
        if (filled.get(element) === raw) element.dataset.helpwrenState = "error";
      })
      .finally(() => {
        if (filled.get(element) === raw) element.removeAttribute("aria-busy");
      });
  }

  function helpList(articles: HelpArticle[]): HTMLUListElement {
    const list = document.createElement("ul");
    list.className = "helpwren-help-list";
    for (const article of articles) {
      const item = document.createElement("li");
      item.className = "helpwren-help-item";
      const link = document.createElement("a");
      link.className = "helpwren-help-link";
      link.href = article.url ?? new URL("/help", appOrigin).href;
      const title = document.createElement("span");
      title.className = "helpwren-help-title";
      title.textContent = article.title;
      link.append(title);
      if (article.summary) {
        const summary = document.createElement("span");
        summary.className = "helpwren-help-summary";
        summary.textContent = article.summary;
        link.append(summary);
      }
      link.addEventListener("click", (event) => {
        // A new tab, or no chat on the page: the link goes where it says.
        const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey;
        if (!mounted || !plain) return;
        event.preventDefault();
        showScreen({ channel: CHANNEL, type: "article", slug: article.slug });
      });
      item.append(link);
      list.append(item);
    }
    return list;
  }

  /** Fills every inline list on the page now, and each one added or changed later. */
  function watchHelp(): () => void {
    const fillWithin = (root: ParentNode) => {
      for (const element of root.querySelectorAll<HTMLElement>(`[${HELP_ATTRIBUTE}]`)) {
        fillHelp(element);
      }
    };
    fillWithin(document);
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === "attributes" && change.target instanceof HTMLElement) {
          fillHelp(change.target);
        }
        for (const node of change.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.hasAttribute(HELP_ATTRIBUTE)) fillHelp(node);
          fillWithin(node);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [HELP_ATTRIBUTE],
    });
    return () => {
      observer.disconnect();
    };
  }

  /** The unread reply to show beside the launcher, unless the visitor waved it away. */
  function replyToShow(): LatestUnread | undefined {
    if (unread === 0 || !latest) return undefined;
    return dismissedReply === replyKey(latest) ? undefined : latest;
  }

  /**
   * Beside the launcher: the newest unread reply from the team when there is one, otherwise the
   * welcome message. Either way, who it is from and what it says; the welcome adds its replies.
   */
  function paintTeaser() {
    const teaser = mounted?.teaser;
    if (!mounted || !teaser) return;
    const { welcome, quickReplies, name, logo } = appearance;
    const open = mounted.panel.dataset.open === "true";
    const reply = previewing ? undefined : replyToShow();
    teaser.box.hidden = reply
      ? open
      : open || teaserSeen || !showWelcome || (!welcome && quickReplies.length === 0);

    teaser.name.textContent = name;
    teaser.message.textContent = reply ? reply.preview : (welcome ?? "How can we help?");
    if (logo) {
      const image = document.createElement("img");
      image.alt = "";
      image.src = logo;
      teaser.avatar.replaceChildren(image);
      teaser.avatar.dataset.logo = "";
    } else {
      delete teaser.avatar.dataset.logo;
      teaser.avatar.textContent = Array.from(name.trim())[0]?.toUpperCase() ?? "";
    }
    teaser.replies.replaceChildren(
      ...(reply ? [] : quickReplies).map((quickReply) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = quickReply;
        chip.addEventListener("click", () => {
          startConversation({ reply: quickReply });
        });
        return chip;
      }),
    );
  }

  /** The teaser was clicked: the reply's conversation, or a new one from the welcome. */
  function openTeaser() {
    const reply = replyToShow();
    if (!reply || !mounted) {
      startConversation();
      return;
    }
    post({ channel: CHANNEL, type: "open", conversationId: reply.conversationId });
    setOpen(true);
  }

  function dismissTeaser() {
    const reply = replyToShow();
    if (reply) dismissedReply = replyKey(reply);
    else markTeaserSeen();
    paintTeaser();
  }

  /** Puts the appearance on the widget. Every value has been checked by `parseAppearance`. */
  function paint() {
    if (!mounted) return;
    const { host, launcher } = mounted;
    host.dataset.position = appearance.position;
    host.style.setProperty("--hw-x", `${appearance.offsetX}px`);
    host.style.setProperty("--hw-y", `${appearance.offsetY}px`);
    host.style.setProperty("--hw-accent", appearance.accent);
    host.style.setProperty("--hw-accent-ink", appearance.accentInk);
    host.style.setProperty(
      "--hw-accent-fill",
      appearance.accentTo
        ? `linear-gradient(135deg, ${appearance.accent}, ${appearance.accentTo})`
        : appearance.accent,
    );

    paintTeaser();

    const mark = launcher?.querySelector<HTMLElement>('[data-icon="open"]');
    if (!launcher || !mark) return;
    // The logo is only shown when there is one; without it the launcher falls back to the bubble.
    const logo = appearance.launcher === "logo" ? appearance.logo : undefined;
    const wanted = logo ? "logo" : appearance.launcher === "wren" ? "wren" : "chat";
    if (mark instanceof HTMLImageElement && logo) {
      mark.src = logo;
    } else if (logo) {
      const image = document.createElement("img");
      image.dataset.icon = "open";
      image.dataset.mark = "logo";
      image.alt = "";
      image.src = logo;
      mark.replaceWith(image);
    } else if (mark.dataset.mark !== wanted) {
      mark.insertAdjacentHTML("afterend", wanted === "wren" ? wrenIcon : openIcon);
      mark.remove();
    }
  }

  function sendPreview(frame: HTMLIFrameElement) {
    if (previewSettings === undefined) return;
    const message: PageMessage = { channel: CHANNEL, type: "preview", settings: previewSettings };
    frame.contentWindow?.postMessage(message, appOrigin);
  }

  /**
   * Asks the install how its widget should look, and whether this site may show it. Without an
   * answer the defaults stay. Returns `true` when the install says this site is not allowed.
   */
  async function loadAppearance(): Promise<boolean> {
    try {
      const response = await fetch(new URL("/api/widget", appOrigin));
      if (!response.ok) return false;
      const data: unknown = await response.json();
      if (typeof data === "object" && data !== null && "allowed" in data && !data.allowed) {
        return true;
      }
      // The install's settings first, then whatever this page asked for on top of them.
      appearance = parseAppearance(overrides, parseAppearance(data, appearance));
      paint();
    } catch {
      // Offline, or blocked by the page's own rules: the widget still works as it is.
    }
    return false;
  }

  /** Sizes and stacking the page asked for, each kept within a range that still works. */
  function applyLayout(layout: WidgetLayout | undefined) {
    if (!mounted || !layout) return;
    const within = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, Math.round(value)));
    const { style } = mounted.host;
    if (Number.isFinite(layout.width)) {
      style.setProperty("--hw-w", `${within(layout.width ?? 0, 320, 640)}px`);
    }
    if (Number.isFinite(layout.height)) {
      style.setProperty("--hw-h", `${within(layout.height ?? 0, 420, 900)}px`);
    }
    if (Number.isFinite(layout.zIndex)) {
      style.setProperty("--hw-z", String(within(layout.zIndex ?? 0, 0, 2147483647)));
    }
  }

  /** Whether the panel may grow to read an article: floating, on a screen it floats on. */
  const canExpand = () => !inline && floatingScreen?.matches === true;

  function sendLayout() {
    post({ channel: CHANNEL, type: "layout", expandable: canExpand(), expanded });
  }

  /** Grows the panel to a reading size, or puts it back. Only an open, floating panel grows. */
  function setExpanded(wanted: boolean) {
    if (!mounted) return;
    const next = wanted && canExpand() && isOpen();
    if (next === expanded) return;
    expanded = next;
    if (next) mounted.host.dataset.expanded = "";
    else delete mounted.host.dataset.expanded;
    sendLayout();
  }

  /** The screen became too small for the panel to float, or large enough again. */
  function onScreenChange() {
    if (expanded && !canExpand()) setExpanded(false);
    else sendLayout();
  }

  function isOpen() {
    return mounted?.panel.dataset.open === "true";
  }

  function setOpen(wanted: boolean) {
    if (!mounted) return;
    // Inline, the chat is the content of its container: there is nothing to close.
    const open = inline || wanted;
    const changed = mounted.panel.dataset.open !== String(open);
    mounted.panel.dataset.open = String(open);
    // It opens again at its usual size.
    if (!open) setExpanded(false);
    for (const trigger of triggers) trigger.setAttribute("aria-expanded", String(open));
    mounted.launcher?.setAttribute("aria-expanded", String(open));
    mounted.launcher?.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) {
      mounted.frame.focus();
      // Once the chat has been opened the welcome has done its job. A preview shows it again.
      if (!previewing) markTeaserSeen();
    } else if (previewing) {
      teaserSeen = false;
    }
    paintTeaser();
    if (changed) {
      post({ channel: CHANNEL, type: "panel", open });
      for (const listener of listeners[open ? "open" : "close"]) listener();
    }
  }

  const toggle = () => {
    setOpen(!isOpen());
  };

  function setUnread(count: number, newest: LatestUnread | undefined) {
    const before = latest ? replyKey(latest) : undefined;
    latest = count > 0 ? newest : undefined;
    if ((latest ? replyKey(latest) : undefined) !== before) paintTeaser();
    if (count === unread) return;
    unread = count;
    if (mounted?.badge) {
      mounted.badge.hidden = count === 0;
      mounted.badge.textContent = count > 99 ? "99+" : String(count);
    }
    paintTeaser();
    for (const listener of listeners.unread) listener(count);
  }

  /**
   * Tells the chat which page it is on whenever that changes without a page load, as in a
   * single-page app, and when the tab is hidden or shown, so it checks in only while someone
   * is looking. `history.pushState` and `replaceState` fire no event, so they are wrapped.
   */
  function watchPage(): () => void {
    let lastUrl = window.location.href;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      post({
        channel: CHANNEL,
        type: "page",
        page: { url: window.location.href, title: document.title },
        visible: document.visibilityState === "visible",
      });
    };
    const onNavigate = () => {
      // A moment later, so the app has set the new page's title.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.location.href === lastUrl) return;
        lastUrl = window.location.href;
        report();
      }, 100);
    };

    const { history } = window;
    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    const wrappedPush: History["pushState"] = (...args) => {
      pushState(...args);
      onNavigate();
    };
    const wrappedReplace: History["replaceState"] = (...args) => {
      replaceState(...args);
      onNavigate();
    };
    window.history.pushState = wrappedPush;
    window.history.replaceState = wrappedReplace;
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("hashchange", onNavigate);
    document.addEventListener("visibilitychange", report);

    return () => {
      clearTimeout(timer);
      // Put back only our own wrapper: something wrapped after us keeps working.
      if (window.history.pushState === wrappedPush) window.history.pushState = pushState;
      if (window.history.replaceState === wrappedReplace) {
        window.history.replaceState = replaceState;
      }
      window.removeEventListener("popstate", onNavigate);
      window.removeEventListener("hashchange", onNavigate);
      document.removeEventListener("visibilitychange", report);
    };
  }

  function post(message: PageMessage) {
    // Addressed to the app's origin only, so no other site loaded in the frame could read it.
    if (frameReady) mounted?.frame.contentWindow?.postMessage(message, appOrigin);
  }

  /** Hands the chat who the visitor is. A token goes by message, never in an address. */
  async function sendIdentity() {
    const sending = identity;
    if (!sending) return;
    if (sending.token === undefined) {
      const { id, name, email } = sending;
      post({ channel: CHANNEL, type: "identify", details: { id, name, email } });
      return;
    }
    try {
      const token = typeof sending.token === "function" ? await sending.token() : sending.token;
      // The visitor may have logged out, or in as someone else, while the token was fetched.
      if (identity === sending) post({ channel: CHANNEL, type: "identify", token });
    } catch {
      for (const listener of listeners.identity) listener({ state: "failed", reason: "error" });
    }
  }

  function onIdentity(state: IdentityState) {
    const expired = state.state === "failed" && state.reason === "expired";
    if (expired && typeof identity?.token === "function" && !retriedToken) {
      retriedToken = true;
      void sendIdentity();
      return;
    }
    if (state.state === "user") retriedToken = false;
    for (const listener of listeners.identity) listener(state);
  }

  function sendContext() {
    post({
      channel: CHANNEL,
      type: "context",
      context: context ?? {},
      ...(filter ? { filter } : {}),
    });
  }

  function greet(frame: HTMLIFrameElement) {
    const hello: PageMessage = {
      channel: CHANNEL,
      type: "hello",
      page: { url: window.location.href, title: document.title },
      ...(document.referrer ? { referrer: document.referrer } : {}),
      closable: !inline,
      open: isOpen(),
      identified: identity?.token !== undefined,
    };
    // Addressed to the app's origin only, so no other site loaded in the frame could read it.
    frame.contentWindow?.postMessage(hello, appOrigin);
    sendLayout();
    if (context || filter) sendContext();
    void sendIdentity();
  }

  function onMessage(event: MessageEvent) {
    // Only the chat frame, on the app's own origin, may talk to the widget.
    if (!mounted || event.origin !== appOrigin || event.source !== mounted.frame.contentWindow) {
      return;
    }
    if (!isFrameMessage(event.data)) return;
    if (event.data.type === "ready") {
      const first = !frameReady;
      frameReady = true;
      greet(mounted.frame);
      if (first) for (const listener of listeners.ready) listener();
      sendPreview(mounted.frame);
      if (waiting) {
        mounted.frame.contentWindow?.postMessage(waiting, appOrigin);
        waiting = undefined;
      }
    } else if (event.data.type === "unread") setUnread(event.data.count, event.data.latest);
    else if (event.data.type === "identity") {
      const { state } = event.data;
      onIdentity(state === "failed" ? { state, reason: event.data.reason } : { state });
    } else if (event.data.type === "size") setExpanded(event.data.size === "expanded");
    else setOpen(false);
  }

  const widget: HelpwrenWidget = {
    init(options = {}) {
      if (mounted) return;

      const host = document.createElement("div");
      host.dataset.helpwren = "";
      const root = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = styles;

      const panel = document.createElement("div");
      panel.className = "panel";
      panel.dataset.open = "false";

      const frame = document.createElement("iframe");
      frame.title = "Chat";
      // So a video in a help article can go full screen or float, as it can on a page.
      frame.allow = "fullscreen; picture-in-picture; encrypted-media";
      const url = new URL("/embed", appOrigin);
      url.searchParams.set("source", options.source ?? "web");
      if (options.preview) url.searchParams.set("preview", "1");
      frame.src = url.href;
      panel.append(frame);
      root.append(style, panel);

      let launcher: HTMLButtonElement | undefined;
      let badge: HTMLSpanElement | undefined;
      let teaser: Teaser | undefined;
      const container =
        typeof options.container === "string"
          ? document.querySelector<HTMLElement>(options.container)
          : options.container;
      // Inline needs somewhere to go; without it the chat falls back to floating.
      inline = options.mode === "inline" && Boolean(container);
      showWelcome = options.welcome !== false;
      overrides = options.appearance ?? {};
      previewing = options.preview !== undefined;
      teaserSeen = previewing ? false : readTeaserSeen();
      if (options.launcher !== false && !inline) {
        const box = document.createElement("div");
        box.className = "teaser";
        box.hidden = true;
        const card = document.createElement("div");
        card.className = "teaser-card";
        const open = document.createElement("button");
        open.type = "button";
        open.className = "teaser-open";
        const avatar = document.createElement("span");
        avatar.className = "teaser-avatar";
        const words = document.createElement("span");
        words.className = "teaser-words";
        const name = document.createElement("span");
        name.className = "teaser-name";
        const message = document.createElement("span");
        message.className = "teaser-message";
        words.append(name, message);
        open.append(avatar, words);
        open.addEventListener("click", openTeaser);
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.className = "teaser-close";
        dismiss.setAttribute("aria-label", "Dismiss");
        dismiss.innerHTML = dismissIcon;
        dismiss.addEventListener("click", dismissTeaser);
        card.append(open, dismiss);
        const replies = document.createElement("div");
        replies.className = "teaser-replies";
        box.append(card, replies);
        root.append(box);
        teaser = { box, avatar, name, message, replies };

        launcher = document.createElement("button");
        launcher.type = "button";
        launcher.className = "launcher";
        launcher.innerHTML = openIcon + closeIcon;
        badge = document.createElement("span");
        badge.className = "badge";
        badge.hidden = true;
        launcher.append(badge);
        launcher.addEventListener("click", toggle);
        root.append(launcher);
      }

      triggers =
        options.trigger === undefined
          ? []
          : typeof options.trigger === "string"
            ? [...document.querySelectorAll(options.trigger)]
            : options.trigger instanceof Element
              ? [options.trigger]
              : [...options.trigger];
      for (const trigger of triggers) trigger.addEventListener("click", toggle);

      mounted = { host, teaser, launcher, badge, panel, frame };
      floatingScreen = window.matchMedia(FLOATING_SCREEN);
      floatingScreen.addEventListener("change", onScreenChange);
      if (container) host.dataset.contained = "";
      if (inline) host.dataset.mode = "inline";
      applyLayout(options.layout);
      setOpen(options.open === true);
      window.addEventListener("message", onMessage);
      // A preview is not a visit, so it reports no pages.
      if (!previewing) {
        stopWatchingPage = watchPage();
        stopWatchingHelp = watchHelp();
      }
      (container ?? document.body).append(host);

      if (options.preview) {
        appearance = parseAppearance(options.preview.appearance, appearance);
        previewSettings = options.preview.settings;
        paint();
      } else {
        appearance = parseAppearance(overrides, appearance);
        paint();
        // Hidden until the install answers, so a site it refuses never shows a launcher that
        // opens on a blank panel. It says why to whoever is building the site, and goes.
        host.style.display = "none";
        void loadAppearance().then((refused) => {
          if (!refused) {
            host.style.removeProperty("display");
            return;
          }
          console.error(
            `Helpwren: ${window.location.origin} may not show this chat. Add it to the allowed domains in ${appOrigin}/dashboard/settings/installation.`,
          );
          widget.destroy();
        });
      }
    },

    update(changes) {
      if (changes.appearance) {
        overrides = { ...overrides, ...changes.appearance };
        appearance = parseAppearance(overrides, appearance);
        paint();
      }
      applyLayout(changes.layout);
    },

    preview(preview) {
      appearance = parseAppearance(preview.appearance, appearance);
      previewSettings = preview.settings;
      paint();
      if (mounted) sendPreview(mounted.frame);
    },

    destroy() {
      if (!mounted) return;
      window.removeEventListener("message", onMessage);
      floatingScreen?.removeEventListener("change", onScreenChange);
      floatingScreen = undefined;
      expanded = false;
      stopWatchingPage?.();
      stopWatchingPage = undefined;
      stopWatchingHelp?.();
      stopWatchingHelp = undefined;
      latest = undefined;
      dismissedReply = undefined;
      for (const trigger of triggers) {
        trigger.removeEventListener("click", toggle);
        trigger.removeAttribute("aria-expanded");
      }
      triggers = [];
      overrides = {};
      inline = false;
      mounted.host.remove();
      mounted = undefined;
      appearance = defaultAppearance;
      previewSettings = undefined;
      frameReady = false;
      waiting = undefined;
    },

    show() {
      setOpen(true);
    },

    hide() {
      setOpen(false);
    },

    toggle,
    isOpen,

    identify(who) {
      identity = who;
      retriedToken = false;
      void sendIdentity();
    },

    reset() {
      identity = undefined;
      retriedToken = false;
      post({ channel: CHANNEL, type: "reset" });
    },

    setContext(next) {
      const { filter: wanted, ...values } = next;
      // Only plain values go to the team; the chat refuses anything else.
      context = Object.fromEntries(
        Object.entries(values).filter(
          (entry): entry is [string, PageContext[string]] =>
            entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1]),
        ),
      );
      filter = wanted;
      sendContext();
    },

    findArticles,

    openArticle(slug) {
      showScreen({ channel: CHANNEL, type: "article", slug });
    },

    startConversation(draft) {
      startConversation(draft === undefined ? {} : { draft });
    },

    on(event, listener) {
      listeners[event].add(listener);
      return () => {
        listeners[event].delete(listener);
      };
    },

    embedHelp(container, options) {
      return createHelpEmbed(appOrigin, container, options);
    },
  };
  return widget;
}
