"use client";

import { useEffect } from "react";

/**
 * Tells the page that frames the help center how tall its content is, so the host can size the
 * frame and show no scrollbar of its own. The message carries a height and nothing else, so it
 * is safe to send to whichever site is framing: `{ channel: "helpwren", type: "help-height",
 * height }`, the same channel name the chat widget's messages use.
 */
export function EmbedFrame() {
  useEffect(() => {
    if (window.parent === window) return undefined;
    let last = 0;
    const report = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ channel: "helpwren", type: "help-height", height }, "*");
    };
    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    report();
    return () => {
      observer.disconnect();
    };
  }, []);
  return null;
}
