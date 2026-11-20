"use client";

import { type HelpwrenWidget, type InitOptions } from "helpwren";
import Script from "next/script";
import { useEffect } from "react";

import { HELPWREN_URL } from "@/lib/config";

declare global {
  interface Window {
    /** Defined by the install's widget.js. */
    Helpwren?: HelpwrenWidget;
  }
}

/**
 * The install's snippet, as the public site pastes it: `widget.js` from the install, then
 * `init`. Each page passes its own options, so the widget is added when a page opens and taken
 * off when it closes.
 */
export function SiteWidget({ options = {} }: { options?: InitOptions }) {
  useEffect(
    () => () => {
      window.Helpwren?.destroy();
    },
    [],
  );
  return (
    <Script
      src={`${HELPWREN_URL}/widget.js`}
      // Runs once the script has loaded, and again each time a page with it opens.
      onReady={() => {
        window.Helpwren?.init({ source: "web", ...options });
      }}
    />
  );
}

/** The site's own "Help" button, for a page that hides the launcher. */
export function HelpButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.Helpwren?.show();
      }}
    >
      Help
    </button>
  );
}

/** Opens a new conversation with words already in the message box. Nothing is sent for them. */
export function AskButton({ draft, children }: { draft: string; children: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.Helpwren?.startConversation(draft);
      }}
    >
      {children}
    </button>
  );
}
