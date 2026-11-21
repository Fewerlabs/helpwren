import { CHANNEL } from "./protocol";

/** The parts of the embedded help center a host may leave out. */
export type HelpEmbedPart =
  | "title"
  | "subtitle"
  | "search"
  | "collections"
  | "popular"
  | "breadcrumbs"
  | "related"
  | "feedback"
  | "chat";

export interface HelpEmbedOptions {
  /** Parts to leave out. Everything shows when it is left out. */
  hide?: readonly HelpEmbedPart[];
  /** Opens on one collection, by its slug, in place of the help center's home. */
  collection?: string;
  /** Opens on a search for these words. */
  query?: string;
  /** Less room around the content: `compact`, or `none` to sit in your own padding. */
  padding?: "compact" | "none";
  /** What is behind the content: `transparent`, or a colour as `#rrggbb`. */
  background?: string;
  /** Your page's theme, in place of the reader's choice. */
  theme?: "light" | "dark";
  /** Your colour as `#rrggbb`, in place of the brand's. */
  accent?: string;
  /** Names the frame for assistive technology. Default: "Help". */
  title?: string;
}

/** The address of the embedded help center with these options. */
export function helpEmbedUrl(appOrigin: string, options: HelpEmbedOptions = {}): string {
  const url = new URL("/help", appOrigin);
  const set = (name: string, value: string | undefined) => {
    if (value) url.searchParams.set(name, value);
  };
  set("embed", "1");
  set("hide", options.hide?.join(","));
  set("collection", options.collection);
  set("q", options.query);
  set("padding", options.padding);
  set("bg", options.background?.replace("#", ""));
  set("theme", options.theme);
  set("accent", options.accent?.replace("#", ""));
  return url.toString().replaceAll("%2C", ",");
}

/**
 * Puts the help center in a frame inside `container`, as wide as the container and as tall as
 * what it shows, growing and shrinking as the reader moves around it. Returns a function that
 * takes it away again.
 */
export function createHelpEmbed(
  appOrigin: string,
  container: HTMLElement,
  options: HelpEmbedOptions = {},
): () => void {
  const frame = document.createElement("iframe");
  frame.src = helpEmbedUrl(appOrigin, options);
  frame.title = options.title ?? "Help";
  frame.setAttribute("style", "display: block; width: 100%; min-height: 320px; border: 0");

  // Only this frame's own messages: a page may hold more than one.
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
    const message = event.data as { channel?: unknown; type?: unknown; height?: unknown } | null;
    if (message?.channel !== CHANNEL || message.type !== "help-height") return;
    if (typeof message.height !== "number" || !Number.isFinite(message.height)) return;
    // The frame's own height from now on, small or large, in place of the starting minimum.
    frame.style.minHeight = "0";
    frame.style.height = `${String(Math.max(0, Math.ceil(message.height)))}px`;
  };

  window.addEventListener("message", onMessage);
  container.append(frame);
  return () => {
    window.removeEventListener("message", onMessage);
    frame.remove();
  };
}
