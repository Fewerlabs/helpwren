import { publicSettingsSchema, type PublicSettings } from "@helpwren/core";
import { CHANNEL } from "helpwren/protocol";
import { useEffect, useState } from "react";
import { z } from "zod";

const previewSchema = z.object({
  channel: z.literal(CHANNEL),
  type: z.literal("preview"),
  settings: publicSettingsSchema,
});

/**
 * The settings the chat shows. In the dashboard's preview they follow the form being edited,
 * which sends them from the page around the frame. They are taken only from a page on the
 * chat's own origin, so no other site can restyle the chat it embeds.
 */
export function usePreviewSettings(saved: PublicSettings, preview: boolean): PublicSettings {
  const [sent, setSent] = useState<PublicSettings | null>(null);

  useEffect(() => {
    if (!preview || window.parent === window) return undefined;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const message = previewSchema.safeParse(event.data);
      if (message.success) setSent(message.data.settings);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [preview]);

  return sent ?? saved;
}
