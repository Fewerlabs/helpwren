import { CHANNEL, type FrameMessage } from "helpwren/protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useSetPage } from "../store/chat-store";

// The page's side of this is the widget script (packages/widget/src/protocol.ts).
const helloSchema = z.object({
  channel: z.literal(CHANNEL),
  type: z.literal("hello"),
  page: z.object({ url: z.url().max(2000), title: z.string().max(300) }),
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
  const [embedded, setEmbedded] = useState(false);
  const pageOrigin = useRef<string | null>(null);
  const latestUnread = useRef(unread);

  const send = useCallback((message: FrameMessage) => {
    if (pageOrigin.current) window.parent.postMessage(message, pageOrigin.current);
  }, []);

  useEffect(() => {
    if (window.parent === window) return undefined;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const hello = helloSchema.safeParse(event.data);
      if (!hello.success) return;

      pageOrigin.current = event.origin;
      setPage(hello.data.page);
      setEmbedded(true);
      send({ channel: CHANNEL, type: "unread", count: latestUnread.current });
    };

    window.addEventListener("message", onMessage);
    // Sent to any origin: it says only that the chat has started, and whoever framed it knows.
    window.parent.postMessage({ channel: CHANNEL, type: "ready" } satisfies FrameMessage, "*");
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [send, setPage]);

  useEffect(() => {
    latestUnread.current = unread;
    send({ channel: CHANNEL, type: "unread", count: unread });
  }, [send, unread]);

  const close = useCallback(() => {
    send({ channel: CHANNEL, type: "close" });
  }, [send]);

  return { embedded, close };
}
