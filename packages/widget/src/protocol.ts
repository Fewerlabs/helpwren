/**
 * The messages the widget script and the chat frame send each other with `postMessage`. The
 * chat's side of this lives in the app (`apps/web/src/features/chat`); keep the two in step.
 *
 * The frame announces that it is ready, saying nothing else, and the page answers with `hello`.
 * The frame learns the page's origin from that answer and sends everything after it to that
 * origin only, so nothing about the visitor reaches a page that did not embed the chat.
 */
export const CHANNEL = "helpwren";

/** From the page to the chat frame. */
export type PageMessage =
  /** Sent whenever the frame says it is ready. */
  | { channel: typeof CHANNEL; type: "hello"; page: { url: string; title: string } }
  /**
   * Settings to show in place of the saved ones, for the preview in the dashboard. The chat
   * checks them, and takes them only from a page on its own origin.
   */
  | { channel: typeof CHANNEL; type: "preview"; settings: unknown };

/** From the chat frame to the page. */
export type FrameMessage =
  /** The chat has started and is listening. Sent to any origin, because it carries nothing. */
  | { channel: typeof CHANNEL; type: "ready" }
  | { channel: typeof CHANNEL; type: "unread"; count: number }
  /** The visitor pressed the close button inside the chat. */
  | { channel: typeof CHANNEL; type: "close" };

export function isFrameMessage(data: unknown): data is FrameMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  if (message.channel !== CHANNEL) return false;
  if (message.type === "ready" || message.type === "close") return true;
  return (
    message.type === "unread" &&
    typeof message.count === "number" &&
    Number.isInteger(message.count) &&
    message.count >= 0
  );
}
