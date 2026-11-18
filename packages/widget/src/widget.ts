import { CHANNEL, isFrameMessage, type PageMessage } from "./protocol";
import { closeIcon, openIcon, styles } from "./styles";

export interface InitOptions {
  /** Where this page is, as one of the install's sources. Default `web`. */
  source?: string;
  /**
   * Whether to show the round launcher button. Turn it off to open the chat from your own
   * button with `Helpwren.show()`. Default true.
   */
  launcher?: boolean;
}

export interface HelpwrenEvents {
  /** The number of unread messages changed. Use it for a badge on your own button. */
  unread: (count: number) => void;
}

export interface HelpwrenWidget {
  /** Adds the chat to the page. Safe to call more than once; later calls do nothing. */
  init: (options?: InitOptions) => void;
  /** Opens the chat panel. */
  show: () => void;
  /** Closes the chat panel. */
  hide: () => void;
  /** Listens for an event. Returns a function that stops listening. */
  on: <Event extends keyof HelpwrenEvents>(
    event: Event,
    listener: HelpwrenEvents[Event],
  ) => () => void;
}

interface Mounted {
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
  const listeners = new Set<HelpwrenEvents["unread"]>();
  let mounted: Mounted | undefined;
  let unread = 0;

  function setOpen(open: boolean) {
    if (!mounted) return;
    mounted.panel.dataset.open = String(open);
    mounted.launcher?.setAttribute("aria-expanded", String(open));
    mounted.launcher?.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) mounted.frame.focus();
  }

  function setUnread(count: number) {
    if (count === unread) return;
    unread = count;
    if (mounted?.badge) {
      mounted.badge.hidden = count === 0;
      mounted.badge.textContent = count > 99 ? "99+" : String(count);
    }
    for (const listener of listeners) listener(count);
  }

  function greet(frame: HTMLIFrameElement) {
    const hello: PageMessage = {
      channel: CHANNEL,
      type: "hello",
      page: { url: window.location.href, title: document.title },
    };
    // Addressed to the app's origin only, so no other site loaded in the frame could read it.
    frame.contentWindow?.postMessage(hello, appOrigin);
  }

  function onMessage(event: MessageEvent) {
    // Only the chat frame, on the app's own origin, may talk to the widget.
    if (!mounted || event.origin !== appOrigin || event.source !== mounted.frame.contentWindow) {
      return;
    }
    if (!isFrameMessage(event.data)) return;
    if (event.data.type === "ready") greet(mounted.frame);
    else if (event.data.type === "unread") setUnread(event.data.count);
    else setOpen(false);
  }

  return {
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
      const url = new URL("/embed", appOrigin);
      url.searchParams.set("source", options.source ?? "web");
      frame.src = url.href;
      panel.append(frame);
      root.append(style, panel);

      let launcher: HTMLButtonElement | undefined;
      let badge: HTMLSpanElement | undefined;
      if (options.launcher !== false) {
        launcher = document.createElement("button");
        launcher.type = "button";
        launcher.className = "launcher";
        launcher.innerHTML = openIcon + closeIcon;
        badge = document.createElement("span");
        badge.className = "badge";
        badge.hidden = true;
        launcher.append(badge);
        launcher.addEventListener("click", () => {
          setOpen(mounted?.panel.dataset.open !== "true");
        });
        root.append(launcher);
      }

      mounted = { launcher, badge, panel, frame };
      setOpen(false);
      window.addEventListener("message", onMessage);
      document.body.append(host);
    },

    show() {
      setOpen(true);
    },

    hide() {
      setOpen(false);
    },

    // "unread" is the only event so far, so its name is not looked at.
    on(_event, listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
