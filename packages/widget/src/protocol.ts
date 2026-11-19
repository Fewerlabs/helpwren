/**
 * The messages the widget script and the chat frame send each other with `postMessage`. The
 * chat's side of this lives in the app (`apps/web/src/features/chat`); keep the two in step.
 *
 * In a mobile app the chat is the whole page of a web view, and the same messages travel as JSON
 * strings: to the app through `window.ReactNativeWebView.postMessage`, and from it as message
 * events the app dispatches in the page (`@helpwren/react-native` does both).
 *
 * The frame announces that it is ready, saying nothing else, and the page answers with `hello`.
 * The frame learns the page's origin from that answer and sends everything after it to that
 * origin only, so nothing about the visitor reaches a page that did not embed the chat.
 */
export const CHANNEL = "helpwren";

/** From the page to the chat frame. */
export type PageMessage =
  /** Sent whenever the frame says it is ready. */
  | {
      channel: typeof CHANNEL;
      type: "hello";
      /** The page the chat is on. An app, which has none, leaves it out. */
      page?: { url: string; title: string };
      /** False when the chat is the content of the page and has nothing to close into. */
      closable?: boolean;
      /**
       * True when the page vouches for a logged-in user and their token is on its way. When it
       * is not, a chat still signed in as a user from an earlier visit signs out: the page is
       * the one that knows whether they are still logged in.
       */
      identified?: boolean;
    }
  /**
   * Who the visitor is. With a `token`, the install confirms it and signs them in as that
   * user. With `details` alone they stay a guest, and the details are only labels for the team.
   */
  | { channel: typeof CHANNEL; type: "identify"; token?: string; details?: VisitorDetails }
  /** The visitor logged out of the page. The chat forgets who they were. */
  | { channel: typeof CHANNEL; type: "reset" }
  /** What the page wants the team to know about where the visitor is. Replaces what was sent. */
  | { channel: typeof CHANNEL; type: "context"; context: PageContext }
  /** Shows one of the visitor's conversations, as when they tap a notification about it. */
  | { channel: typeof CHANNEL; type: "open"; conversationId: string }
  /**
   * Start a new conversation. `reply` is a quick reply the visitor tapped beside the launcher,
   * which the chat sends for them if it is one of the install's own. `draft` is text from the
   * page, which the chat only puts in the message box.
   */
  | { channel: typeof CHANNEL; type: "start"; reply?: string; draft?: string }
  /**
   * Settings to show in place of the saved ones, for the preview in the dashboard. The chat
   * checks them, and takes them only from a page on its own origin.
   */
  | { channel: typeof CHANNEL; type: "preview"; settings: unknown };

/** What a page says about a visitor without proof. Shown to the team; unlocks nothing. */
export interface VisitorDetails {
  id?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
}

/** A few plain values, by name, such as `{ plan: "pro", orderId: 1234 }`. */
export type PageContext = Record<string, string | number | boolean | null>;

/** Whether the chat is signed in as one of the page's users, and if not after trying, why. */
export type IdentityState =
  | { state: "guest" }
  | { state: "user" }
  | { state: "failed"; reason: "expired" | "rejected" | "off" | "error" };

/** From the chat frame to the page. */
export type FrameMessage =
  /** The chat has started and is listening. Sent to any origin, because it carries nothing. */
  | { channel: typeof CHANNEL; type: "ready" }
  | { channel: typeof CHANNEL; type: "unread"; count: number }
  /** The visitor pressed the close button inside the chat. */
  | { channel: typeof CHANNEL; type: "close" }
  /** The answer to `identify` and `reset`. */
  | ({ channel: typeof CHANNEL; type: "identity" } & IdentityState);

const FAILURES = ["expired", "rejected", "off", "error"] as const;

export function isFrameMessage(data: unknown): data is FrameMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  if (message.channel !== CHANNEL) return false;
  if (message.type === "ready" || message.type === "close") return true;
  if (message.type === "identity") {
    if (message.state === "guest" || message.state === "user") return true;
    return message.state === "failed" && (FAILURES as readonly unknown[]).includes(message.reason);
  }
  return (
    message.type === "unread" &&
    typeof message.count === "number" &&
    Number.isInteger(message.count) &&
    message.count >= 0
  );
}
