import { defaultAppearance, parseAppearance, type Appearance } from "./appearance";
import { CHANNEL, isFrameMessage, type PageMessage } from "./protocol";
import { closeIcon, openIcon, styles } from "./styles";

export { type Appearance } from "./appearance";

export interface InitOptions {
  /** Where this page is, as one of the install's sources. Default `web`. */
  source?: string;
  /**
   * Whether to show the round launcher button. Turn it off to open the chat from your own
   * button with `Helpwren.show()`. Default true.
   */
  launcher?: boolean;
  /**
   * Where to put the widget, in place of the whole page: it then sits inside this element,
   * which must be positioned. For showing the widget inside a page of your own.
   */
  container?: HTMLElement;
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
  /** Changes what a widget started as a preview shows. */
  preview: (preview: WidgetPreview) => void;
  /** Takes the widget off the page. `init` can add it again. */
  destroy: () => void;
}

interface Mounted {
  host: HTMLElement;
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
  let appearance = defaultAppearance;
  let previewSettings: unknown;

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

    const mark = launcher?.querySelector<HTMLElement>('[data-icon="open"]');
    if (!launcher || !mark) return;
    const logo = appearance.launcher === "logo" ? appearance.logo : undefined;
    const showsLogo = mark instanceof HTMLImageElement;
    if (logo && showsLogo) {
      mark.src = logo;
    } else if (logo) {
      const image = document.createElement("img");
      image.dataset.icon = "open";
      image.alt = "";
      image.src = logo;
      mark.replaceWith(image);
    } else if (showsLogo) {
      mark.insertAdjacentHTML("afterend", openIcon);
      mark.remove();
    }
  }

  function sendPreview(frame: HTMLIFrameElement) {
    if (previewSettings === undefined) return;
    const message: PageMessage = { channel: CHANNEL, type: "preview", settings: previewSettings };
    frame.contentWindow?.postMessage(message, appOrigin);
  }

  /** Asks the install how its widget should look. Without an answer the defaults stay. */
  async function loadAppearance() {
    try {
      const response = await fetch(new URL("/api/widget", appOrigin));
      if (!response.ok) return;
      appearance = parseAppearance(await response.json(), appearance);
      paint();
    } catch {
      // Offline, or blocked by the page's own rules: the widget still works as it is.
    }
  }

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
    if (event.data.type === "ready") {
      greet(mounted.frame);
      sendPreview(mounted.frame);
    } else if (event.data.type === "unread") setUnread(event.data.count);
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
      if (options.preview) url.searchParams.set("preview", "1");
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

      mounted = { host, launcher, badge, panel, frame };
      setOpen(options.open === true);
      window.addEventListener("message", onMessage);
      if (options.container) host.dataset.contained = "";
      (options.container ?? document.body).append(host);

      if (options.preview) {
        appearance = parseAppearance(options.preview.appearance, appearance);
        previewSettings = options.preview.settings;
        paint();
      } else {
        paint();
        void loadAppearance();
      }
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
      mounted.host.remove();
      mounted = undefined;
      appearance = defaultAppearance;
      previewSettings = undefined;
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
