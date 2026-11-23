"use client";

import Script from "next/script";

const helpwrenUrl = process.env.NEXT_PUBLIC_HELPWREN_URL ?? "http://localhost:3000";

/** Loads the chat on every page. Put it once, in the root layout. */
export function HelpwrenScript() {
  return (
    <Script
      src={`${helpwrenUrl}/widget.js`}
      strategy="afterInteractive"
      onReady={() => {
        window.Helpwren?.init({ source: "web" });
        window.dispatchEvent(new Event("helpwren:ready"));
      }}
    />
  );
}
