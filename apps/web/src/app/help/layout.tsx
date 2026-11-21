import { cn } from "@helpwren/design-system";
import type { ReactNode } from "react";

import { EmbedFrame, EmbedLook, HelpChatLauncher } from "@/features/help-center";
import { brandProps } from "@/lib/accent";
import { BrandOnBody } from "@/lib/brand-on-body";
import { getHelpSettings } from "@/lib/help-center-data";
import { getHelpEmbed } from "@/lib/help-embed-request";

// Drawn for each request and never while building, when there is no database to ask. So a
// published article or a change of branding shows on the very next visit.
export const dynamic = "force-dynamic";

const EMBED_ROOT_ID = "help-embed";

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
      // As wide as the frame and as tall as its content, which is the height the host is told.
      <div
        id={EMBED_ROOT_ID}
        className={cn("text-foreground flex min-w-0 flex-col overflow-x-clip")}
        {...brandProps(brand)}
      >
        <EmbedLook embed={embed} />
        <BrandOnBody brand={brand} />
        {children}
        <EmbedFrame rootId={EMBED_ROOT_ID} />
      </div>
    );
  }

  return (
    <div
      className={cn("bg-card text-foreground relative isolate flex min-h-dvh flex-col")}
      {...brandProps(settings.brand)}
    >
      <BrandOnBody brand={settings.brand} />
      {children}
      {settings.helpCenter.showChat ? <HelpChatLauncher /> : null}
    </div>
  );
}
