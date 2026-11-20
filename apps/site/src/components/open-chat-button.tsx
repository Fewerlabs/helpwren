"use client";

import { Button } from "@helpwren/design-system";
import { useState, type ReactNode } from "react";

import { DEMO_URL } from "@/content/demo";

import { loadWidget } from "./live-widget";

// Its own module, so the button's code is only sent when a demo is set. The icon is drawn by the
// server and passed in, so the icon set is never sent for it.
/** Opens the live chat. Shown only when a demo install is set. */
export function OpenChatButton({ icon }: { icon: ReactNode }) {
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
      {icon}
      Open the live chat
    </Button>
  );
}
