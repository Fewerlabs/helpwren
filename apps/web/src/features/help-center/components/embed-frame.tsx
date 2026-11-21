"use client";

import { useEffect } from "react";

/**
 * Tells the page that frames the help center how tall its content is, so the host can size the
 * frame and show no scrollbar of its own. The message carries a height and nothing else, so it
 * is safe to send to whichever site is framing: `{ channel: "helpwren", type: "help-height",
 * height }`, the same channel name the chat widget's messages use.
 *
 * It measures the element around the content, `rootId`, and not the document, which is never
 * shorter than the frame: a frame that starts taller than its content is told to shrink, and
 * each page reached inside the frame reports its own height.
 */
export function EmbedFrame({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (window.parent === window || !root) return undefined;
    let last = 0;
    const report = () => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ channel: "helpwren", type: "help-height", height }, "*");
    };
    const observer = new ResizeObserver(report);
    observer.observe(root);
    report();
    return () => {
      observer.disconnect();
    };
  }, [rootId]);
  return null;
}
