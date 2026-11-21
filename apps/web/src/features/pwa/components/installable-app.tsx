"use client";

import { toast } from "@helpwren/design-system";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { applyUpdate, checkForUpdate, registerServiceWorker, useUpdateReady } from "../updates";
import { InstallBanner } from "./install-banner";

/** How often an open dashboard asks whether there is a new version. */
const CHECK_EVERY_MS = 30 * 60 * 1000;
/** Coming back to the tab asks again, but not more than once a minute. */
const FOCUS_CHECK_GAP_MS = 60 * 1000;
const UPDATE_TOAST = "app-update";

/**
 * What makes the dashboard an installable app: its service worker, the offer of a new version
 * when one is deployed, and the install banner on a phone. Draws only the banner and the toast.
 */
export function InstallableApp() {
  const router = useRouter();
  const updateReady = useUpdateReady();

  useEffect(() => {
    let lastCheck = Date.now();
    const check = () => {
      lastCheck = Date.now();
      void checkForUpdate().catch(() => undefined);
    };
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastCheck > FOCUS_CHECK_GAP_MS) {
        check();
      }
    };
    // A notification clicked while the dashboard is open moves it to the conversation.
    const onMessage = (event: MessageEvent<unknown>) => {
      const data = event.data as { type?: unknown; url?: unknown } | null;
      if (data?.type === "OPEN" && typeof data.url === "string" && data.url.startsWith("/")) {
        router.push(data.url);
      }
    };

    void registerServiceWorker()
      .then(check)
      .catch(() => undefined);
    const workers = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    workers?.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      workers?.removeEventListener("message", onMessage);
    };
  }, [router]);

  useEffect(() => {
    if (!updateReady) return;
    toast.message("A new version of Helpwren is ready", {
      id: UPDATE_TOAST,
      duration: Infinity,
      action: { label: "Update", onClick: applyUpdate },
    });
  }, [updateReady]);

  return <InstallBanner />;
}
