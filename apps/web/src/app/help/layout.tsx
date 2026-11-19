import type { ReactNode } from "react";

import { EmbedFrame, HelpChatLauncher, HelpFooter } from "@/features/help-center";
import { accentStyle } from "@/lib/accent";
import { getHelpSettings } from "@/lib/help-center-data";
import { getHelpEmbed } from "@/lib/help-embed-request";

// Drawn for each request and never while building, when there is no database to ask. What the
// pages read from the database is kept between requests instead (`lib/help-center-data`).
export const dynamic = "force-dynamic";

/**
 * The frame of the public help center: the customer's colours on everything inside, their
 * footer, and the chat launcher when they want one here. A host that embeds the help center
 * (`?embed=1`) gets the content without any of that. Each page draws its own header,
 * because the home page's is tall and the others' is slim.
 */
export default async function HelpLayout({ children }: { children: ReactNode }) {
  const [settings, embed] = await Promise.all([getHelpSettings(), getHelpEmbed()]);

  // Inside a host's frame: the content alone, with no footer and no launcher of its own, in
  // the host's colour if it gave one. It fills the frame and is never smaller than is usable.
  if (embed) {
    const brand = embed.accent
      ? { accent: embed.accent, accentTo: undefined, button: undefined }
      : settings.brand;
    return (
      <div
        className="bg-background text-foreground flex min-h-80 min-w-72 flex-col"
        style={accentStyle(brand)}
      >
        {children}
        <EmbedFrame />
      </div>
    );
  }

  return (
    <div
      className="bg-background text-foreground flex min-h-dvh flex-col"
      style={accentStyle(settings.brand)}
    >
      {children}
      <HelpFooter settings={settings} />
      {settings.helpCenter.showChat ? <HelpChatLauncher /> : null}
    </div>
  );
}
