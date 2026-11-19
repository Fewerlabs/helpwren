import { type PublicSettings } from "@helpwren/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { useHostVisible, usePage, usePreview, useReferrer } from "../store/chat-store";
import { chatKeys } from "./use-chat";

/** How often an open page checks in. The live list counts a visitor as there for two minutes. */
const CHECK_IN_EVERY_MS = 60_000;

const VISITOR_KEY = "helpwren.visitor";

// Kept here as well, for a browser that blocks storage: one id for as long as the page is open.
let fallbackId: string | undefined;

/** This browser's visitor id, if it has one already. Nothing is created. */
export function existingVisitorId(): string | undefined {
  try {
    return window.localStorage.getItem(VISITOR_KEY) ?? fallbackId;
  } catch {
    return fallbackId;
  }
}

/** This browser's visitor id, made up and remembered the first time it is asked for. */
function visitorId(): string {
  const known = existingVisitorId();
  if (known) return known;
  const made = crypto.randomUUID();
  fallbackId = made;
  try {
    window.localStorage.setItem(VISITOR_KEY, made);
  } catch {
    // Storage is blocked: the id lasts as long as this page.
  }
  return made;
}

/** Only addresses on the web: anything else says nothing about where the visitor came from. */
function webAddress(value: string): string | undefined {
  return /^https?:\/\//.test(value) ? value.slice(0, 2000) : undefined;
}

/** Whether this chat sits in someone else's page or an app, rather than being the page. */
function isHosted(): boolean {
  return window.parent !== window || Boolean(window.ReactNativeWebView);
}

/** For values that do not change while the chat is open, read once in the browser. */
const unchanging = () => () => undefined;

function onVisibilityChange(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => {
    document.removeEventListener("visibilitychange", callback);
  };
}

/**
 * The chat's own page and tab, for when it is not inside another page. Nothing is known while
 * rendering on the server.
 */
function useOwnPage() {
  const visible = useSyncExternalStore(
    onVisibilityChange,
    () => document.visibilityState === "visible",
    () => false,
  );
  const url = useSyncExternalStore(
    unchanging,
    () => window.location.href,
    () => null,
  );
  const title = useSyncExternalStore(
    unchanging,
    () => document.title,
    () => "",
  );
  const referrer = useSyncExternalStore(
    unchanging,
    () => webAddress(document.referrer) ?? null,
    () => null,
  );
  return { page: url ? { url, title } : null, visible, referrer };
}

/**
 * Tells the install which page this visitor is on: at once, whenever the page changes, and once
 * a minute while it is showing, never while the tab is hidden. Inside a host's page the widget
 * reports the page; on its own page the chat reads its own. When a check-in says the team has
 * written to this browser, the message is taken up, starting a guest session if there is none,
 * and arrives like any other reply.
 */
export function useVisitorTracking(settings: PublicSettings, source: string) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const preview = usePreview();
  const hostPage = usePage();
  const hostVisible = useHostVisible();
  const hostReferrer = useReferrer();
  const hosted = useSyncExternalStore(unchanging, isHosted, () => true);
  const own = useOwnPage();
  // Switched off by the server's answer as well as by the setting, for a chat opened before
  // the setting changed.
  const [refused, setRefused] = useState(false);
  const claiming = useRef(false);

  const page = hosted ? hostPage : own.page;
  const visible = hosted ? hostVisible : own.visible;
  const referrer = hosted ? hostReferrer : own.referrer;
  const enabled = !preview && settings.visitors.tracking && !refused;
  const url = page?.url;
  const title = page?.title;

  useEffect(() => {
    if (!enabled || !url || !visible) return undefined;
    let stopped = false;

    const takeUp = async (id: string) => {
      if (claiming.current) return;
      claiming.current = true;
      try {
        const client = getClient();
        await client.sessions.startGuest();
        const conversationId = await client.visitors.claimOutreach({
          visitorId: id,
          source,
          page: { url, ...(title ? { title } : {}) },
        });
        if (conversationId) {
          // A new session, and a new conversation: both are asked for again.
          await queryClient.invalidateQueries({ queryKey: chatKeys.session });
          await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        }
      } finally {
        claiming.current = false;
      }
    };

    const checkIn = async () => {
      const id = visitorId();
      const result = await getClient().visitors.checkIn({
        visitorId: id,
        page: { url, ...(title ? { title: title.slice(0, 300) } : {}) },
        ...(referrer ? { referrer } : {}),
        language: navigator.language.slice(0, 35),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (stopped) return;
      if (!result.ok) {
        if (result.reason === "off") setRefused(true);
        return;
      }
      if (result.outreach) await takeUp(id);
    };

    // A check-in that fails is tried again on the next tick; the chat works without it.
    const run = () => {
      void checkIn().catch(() => undefined);
    };
    run();
    const timer = setInterval(run, CHECK_IN_EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [enabled, getClient, queryClient, referrer, source, title, url, visible]);
}
