import { cn } from "@helpwren/design-system";
import type { ReactNode } from "react";

import { EmbedFrame, HelpChatLauncher } from "@/features/help-center";
import { accentStyle, brandTone } from "@/lib/accent";
import { getHelpSettings } from "@/lib/help-center-data";
import { getHelpEmbed } from "@/lib/help-embed-request";

// Drawn for each request and never while building, when there is no database to ask. So a
// published article or a change of branding shows on the very next visit.
export const dynamic = "force-dynamic";

/**
 * Around every help center page: the customer's colours on everything inside, and the chat
 * launcher when they want one here. Each page draws its own frame (`HelpShell`), because only
 * the page knows where in the list of articles the reader is. A host that embeds the help
 * center (`?embed=1`) gets the content in its own colour if it gave one, and no launcher.
 */
export default async function HelpLayout({ children }: { children: ReactNode }) {
  const [settings, embed] = await Promise.all([getHelpSettings(), getHelpEmbed()]);

  if (embed) {
    const brand = embed.accent
      ? { accent: embed.accent, accentTo: undefined, button: undefined }
      : settings.brand;
    return (
      // It fills the frame it is given and is never smaller than is usable.
      <div
        className={cn("bg-card text-foreground flex min-h-80 min-w-72 flex-col", brandTone(brand))}
        style={accentStyle(brand)}
      >
        {children}
        <EmbedFrame />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card text-foreground relative isolate flex min-h-dvh flex-col",
        brandTone(settings.brand),
      )}
      style={accentStyle(settings.brand)}
    >
      {children}
      {settings.helpCenter.showChat ? <HelpChatLauncher /> : null}
    </div>
  );
}
