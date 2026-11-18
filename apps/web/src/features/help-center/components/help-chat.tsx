"use client";

import { Button, Icon } from "@helpwren/design-system";
import { createWidget, type HelpwrenWidget } from "helpwren";
import { useEffect } from "react";

/** The one widget on the page, once the launcher has made it. */
let widget: HelpwrenWidget | null = null;

/**
 * The chat launcher on help center pages, so a reader can ask when an article falls short. It
 * is the same widget a site loads, pointed at this install.
 */
export function HelpChatLauncher() {
  useEffect(() => {
    const made = createWidget(window.location.origin);
    made.init({ source: "web" });
    widget = made;
    return () => {
      made.destroy();
      widget = null;
    };
  }, []);
  return null;
}

/**
 * "Chat with us", at the end of an article. It opens the launcher's chat when the page has
 * one, and otherwise goes to the chat on a page of its own, which also works with no script.
 */
export function ChatLink() {
  return (
    <Button asChild>
      <a
        href="/chat"
        onClick={(event) => {
          if (!widget) return;
          event.preventDefault();
          widget.show();
        }}
      >
        <Icon name="chat-circle" />
        Chat with us
      </a>
    </Button>
  );
}
