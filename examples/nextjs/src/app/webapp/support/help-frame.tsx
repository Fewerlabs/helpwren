"use client";

import { useEffect, useRef } from "react";

import { HELPWREN_URL } from "@/lib/config";

interface HeightMessage {
  channel: "helpwren";
  type: "help-height";
  height: number;
}

function isHeightMessage(data: unknown): data is HeightMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return (
    message.channel === "helpwren" &&
    message.type === "help-height" &&
    typeof message.height === "number"
  );
}

/**
 * The install's help center inside the app's own page, without its header and footer
 * (`?embed=1`). The frame says how tall it is, so the page grows with it.
 */
export function HelpFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== new URL(HELPWREN_URL).origin || !isHeightMessage(event.data)) return;
      if (frame.current) frame.current.style.height = `${event.data.height}px`;
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);
  return (
    <iframe
      ref={frame}
      className="help"
      title="Help articles"
      src={`${HELPWREN_URL}/help?embed=1&hide=chat`}
    />
  );
}
