import { MESSAGE_MAX_LENGTH, pageContextSchema } from "@helpwren/core";
import { CHANNEL, type FrameMessage, type IdentityState } from "helpwren/protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  usePreview,
  useSetClaimed,
  useSetPage,
  useSetPageContext,
  useSetPendingStart,
  useShowScreen,
} from "../store/chat-store";
import { useIdentity } from "./use-identity";

// The page's side of this is the widget script (packages/widget/src/protocol.ts).
const helloSchema = z.object({
  channel: z.literal(CHANNEL),
  type: z.literal("hello"),
  // An app has no page address to give.
  page: z.object({ url: z.url().max(2000), title: z.string().max(300) }).optional(),
  closable: z.boolean().optional(),
  identified: z.boolean().optional(),
});

/** Everything else the page may say, once it has introduced itself. */
const laterSchema = z.discriminatedUnion("type", [
  z.object({
    channel: z.literal(CHANNEL),
    type: z.literal("identify"),
    token: z.string().min(1).max(8000).optional(),
    details: z
      .object({
        id: z.string().trim().min(1).max(200).optional(),
        name: z.string().trim().min(1).max(120).optional(),
        email: z.email().max(320).optional(),
      })
      .optional(),
  }),
  z.object({ channel: z.literal(CHANNEL), type: z.literal("reset") }),
  z.object({ channel: z.literal(CHANNEL), type: z.literal("context"), context: pageContextSchema }),
  z.object({ channel: z.literal(CHANNEL), type: z.literal("open"), conversationId: z.uuid() }),
]);

/** What an app's web view gives the page, to send messages back to the app with. */
interface NativeHost {
  postMessage: (message: string) => void;
}

declare global {
  interface Window {
    ReactNativeWebView?: NativeHost;
  }
}

/**
 * Where the chat is shown, and how it talks to whoever shows it. In a frame, the host is the
 * page around it, over `postMessage`. In an app, the chat is the whole page of a web view, and
 * the host is the app: it hears the chat through `window.ReactNativeWebView`, and speaks by
 * running a script in the page that dispatches a message event. Such an event has no source
 * and no origin, which no other window's message can have.
 */
interface Host {
  /** Whether a message event came from the host at all. */
  sentBy: (event: MessageEvent) => boolean;
  /** Sends a message to the host, once it has introduced itself. */
  post: (message: FrameMessage, origin: string) => void;
  /** Says the chat is ready, before the host has introduced itself. Carries nothing. */
  announce: (message: FrameMessage) => void;
}

function findHost(): Host | null {
  if (window.parent !== window) {
    return {
      sentBy: (event) => event.source === window.parent,
      post: (message, origin) => {
        window.parent.postMessage(message, origin);
      },
      // Sent to any origin: it says only that the chat has started, and whoever framed it knows.
      announce: (message) => {
        window.parent.postMessage(message, "*");
      },
    };
  }
  const app = window.ReactNativeWebView;
  if (!app) return null;
  return {
    sentBy: (event) => event.source === null && event.origin === "",
    post: (message) => {
      app.postMessage(JSON.stringify(message));
    },
    announce: (message) => {
      app.postMessage(JSON.stringify(message));
    },
  };
}

/** The visitor answered the welcome message beside the launcher. */
const startSchema = z.object({
  channel: z.literal(CHANNEL),
  type: z.literal("start"),
  reply: z.string().max(200).optional(),
  draft: z.string().max(MESSAGE_MAX_LENGTH).optional(),
});

/**
 * Connects the chat to whatever shows it: the page around its frame, or an app's web view.
 * The chat says it is ready, the host answers, and in a frame the page's origin is remembered
 * from that answer: it is the only place anything about the visitor is sent, so nothing reaches
 * a page that did not embed the chat. Which pages may embed it at all is decided by the
 * install's allowed domains, before this code runs.
 */
export function useEmbedBridge(unread: number) {
  const setPage = useSetPage();
  const setPendingStart = useSetPendingStart();
  const show = useShowScreen();
  const setClaimed = useSetClaimed();
  const setPageContext = useSetPageContext();
  const identity = useIdentity();
  const preview = usePreview();
  const [embedded, setEmbedded] = useState(false);
  // False when the chat is the content of the host's page, with nothing to close into.
  const [closable, setClosable] = useState(true);
  // The origin of the host that introduced itself: `""` for an app. `null` until then.
  const pageOrigin = useRef<string | null>(null);
  const host = useRef<Host | null>(null);
  const latestUnread = useRef(unread);

  const send = useCallback((message: FrameMessage) => {
    if (pageOrigin.current !== null) host.current?.post(message, pageOrigin.current);
  }, []);

  useEffect(() => {
    const found = findHost();
    if (!found) return undefined;
    host.current = found;

    const tell = (outcome: Promise<IdentityState>) => {
      void outcome.then((state) => {
        send({ channel: CHANNEL, type: "identity", ...state });
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (!found.sentBy(event)) return;

      // Only the page that has already introduced itself may move the chat to another screen.
      const start = startSchema.safeParse(event.data);
      if (start.success && event.origin === pageOrigin.current) {
        setPendingStart({ reply: start.data.reply, draft: start.data.draft });
        show({ name: "start" });
        return;
      }

      // Who the visitor is, and what the page says about them. A preview is nobody.
      const later = laterSchema.safeParse(event.data);
      if (later.success && event.origin === pageOrigin.current) {
        if (preview) return;
        const message = later.data;
        if (message.type === "open") {
          // From a notification about this conversation. The chat shows it once it is signed
          // in; the access rules decide whether it is theirs to see.
          show({ name: "conversation", id: message.conversationId });
        } else if (message.type === "context") {
          setPageContext(message.context);
        } else if (message.type === "reset") {
          setClaimed(null);
          tell(identity.reset());
        } else if (message.token) {
          setClaimed(null);
          tell(identity.signIn(message.token));
        } else {
          setClaimed(message.details ?? null);
          tell(identity.asGuest());
        }
        return;
      }

      const hello = helloSchema.safeParse(event.data);
      if (!hello.success) return;

      pageOrigin.current = event.origin;
      if (hello.data.page) setPage(hello.data.page);
      setEmbedded(true);
      setClosable(hello.data.closable !== false);
      send({ channel: CHANNEL, type: "unread", count: latestUnread.current });
      // A page that does not vouch for a user gets a guest's chat, whoever was here before.
      // Nothing is said back: the page asked nothing.
      if (!hello.data.identified && !preview) void identity.asGuest();
    };

    window.addEventListener("message", onMessage);
    found.announce({ channel: CHANNEL, type: "ready" });
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [identity, preview, send, setClaimed, setPage, setPageContext, setPendingStart, show]);

  useEffect(() => {
    latestUnread.current = unread;
    send({ channel: CHANNEL, type: "unread", count: unread });
  }, [send, unread]);

  const close = useCallback(() => {
    send({ channel: CHANNEL, type: "close" });
  }, [send]);

  return { embedded, closable, close };
}
