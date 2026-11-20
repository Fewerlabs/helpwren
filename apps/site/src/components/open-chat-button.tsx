"use client";

import { Button, Icon } from "@helpwren/design-system";
import { useState } from "react";

import { DEMO_URL } from "@/content/demo";

import { loadWidget } from "./live-widget";

// Its own module, so the button's code (and the icon set) is only sent when a demo is set.
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
