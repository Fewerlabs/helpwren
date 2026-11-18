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
  page: z.object({ url: z.url().max(2000), title: z.string().max(300) }),
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
]);

/** The visitor answered the welcome message beside the launcher. */
const startSchema = z.object({
  channel: z.literal(CHANNEL),
  type: z.literal("start"),
  reply: z.string().max(200).optional(),
  draft: z.string().max(MESSAGE_MAX_LENGTH).optional(),
});

/**
 * Connects the chat to the page that shows it in a frame, when there is one. The chat says it
 * is ready, the page answers, and the page's origin is remembered from that answer: it is the
 * only place anything about the visitor is sent, so nothing reaches a page that did not embed
 * the chat. Which pages may embed it at all
 * is decided by the install's allowed domains, before this code runs.
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
  const pageOrigin = useRef<string | null>(null);
  const latestUnread = useRef(unread);

  const send = useCallback((message: FrameMessage) => {
    if (pageOrigin.current) window.parent.postMessage(message, pageOrigin.current);
  }, []);

  useEffect(() => {
    if (window.parent === window) return undefined;

    const tell = (outcome: Promise<IdentityState>) => {
      void outcome.then((state) => {
        send({ channel: CHANNEL, type: "identity", ...state });
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;

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
        if (message.type === "context") {
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
      setPage(hello.data.page);
      setEmbedded(true);
      setClosable(hello.data.closable !== false);
      send({ channel: CHANNEL, type: "unread", count: latestUnread.current });
      // A page that does not vouch for a user gets a guest's chat, whoever was here before.
      // Nothing is said back: the page asked nothing.
      if (!hello.data.identified && !preview) void identity.asGuest();
    };

    window.addEventListener("message", onMessage);
    // Sent to any origin: it says only that the chat has started, and whoever framed it knows.
    window.parent.postMessage({ channel: CHANNEL, type: "ready" } satisfies FrameMessage, "*");
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
