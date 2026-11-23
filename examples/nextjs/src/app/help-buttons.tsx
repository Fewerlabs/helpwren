"use client";

import { useEffect, useState } from "react";

/** Your own buttons for the chat: one opens it with an unread count, one starts a message. */
export function HelpButtons() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let stop: (() => void) | undefined;
    const listen = () => {
      stop?.();
      stop = window.Helpwren?.on("unread", setUnread);
    };
    listen();
    window.addEventListener("helpwren:ready", listen);
    return () => {
      window.removeEventListener("helpwren:ready", listen);
      stop?.();
    };
  }, []);

  return (
    <p className="buttons">
      <button type="button" onClick={() => window.Helpwren?.toggle()}>
        Help {unread > 0 ? `(${unread})` : null}
      </button>
      <button
        type="button"
        onClick={() => window.Helpwren?.startConversation("I have a question about my order.")}
      >
        Ask about my order
      </button>
    </p>
  );
}
