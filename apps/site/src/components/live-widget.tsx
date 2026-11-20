"use client";

import { Button, Icon } from "@helpwren/design-system";
import { useEffect, useState } from "react";

import { DEMO_URL } from "@/content/demo";
import { useIdle } from "@/motion/preference";

/**
 * The real Helpwren widget, from a live demo install, loaded once the page has settled. The
 * install's address comes from NEXT_PUBLIC_HELPWREN_DEMO_URL at build time; without it, nothing
 * loads and the page shows captures of the widget instead. The demo install must list this
 * site's domain under Settings → Installation → allowed domains.
 */

/** Fired on window when the visitor opens the chat, so the wren beside it can react. */
export const OPEN_EVENT = "helpwren:open";

interface HelpwrenApi {
  init: (options: { source: string }) => void;
  show: () => void;
  on: (event: "open", listener: () => void) => () => void;
}

declare global {
  interface Window {
    Helpwren?: HelpwrenApi;
  }
}

let loading: Promise<HelpwrenApi | null> | null = null;

/** Loads the widget script once and starts it. Resolves to the API, or null without a demo. */
export function loadWidget(): Promise<HelpwrenApi | null> {
  if (!DEMO_URL) return Promise.resolve(null);
  loading ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `${DEMO_URL}/widget.js`;
    script.async = true;
    script.onload = () => {
      const api = window.Helpwren;
      if (!api) {
        resolve(null);
        return;
      }
      api.init({ source: "web" });
      api.on("open", () => {
        window.dispatchEvent(new Event(OPEN_EVENT));
      });
      resolve(api);
    };
    script.onerror = () => {
      resolve(null);
    };
    document.body.append(script);
  });
  return loading;
}

/** Puts the live widget on the page once the browser is idle, when a demo install is set. */
export function LiveWidget() {
  const idle = useIdle();
  useEffect(() => {
    if (idle) void loadWidget();
  }, [idle]);
  return null;
}

/** Opens the live chat. Shown only when a demo install is set. */
export function OpenChatButton() {
  const [opening, setOpening] = useState(false);
  if (!DEMO_URL) return null;
  return (
    <Button
      loading={opening}
      onClick={() => {
        setOpening(true);
        void loadWidget().then((api) => {
          api?.show();
          setOpening(false);
        });
      }}
    >
      <Icon name="chat-wren" className="size-4" />
      Open the live chat
    </Button>
  );
}

/** Counts the times the chat has been opened, for a wren that hops each time. */
export function useChatOpens(): number {
  const [opens, setOpens] = useState(0);
  useEffect(() => {
    const onOpen = () => {
      setOpens((count) => count + 1);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);
  return opens;
}
