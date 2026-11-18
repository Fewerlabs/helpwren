import type { ReactNode } from "react";

import { HelpChatLauncher, HelpFooter } from "@/features/help-center";
import { accentStyle } from "@/lib/accent";
import { getHelpSettings } from "@/lib/help-center-data";

// Drawn for each request and never while building, when there is no database to ask. What the
// pages read from the database is kept between requests instead (`lib/help-center-data`).
export const dynamic = "force-dynamic";

/**
 * The frame of the public help center: the customer's colours on everything inside, their
 * footer, and the chat launcher when they want one here. Each page draws its own header,
 * because the home page's is tall and the others' is slim.
 */
export default async function HelpLayout({ children }: { children: ReactNode }) {
  const settings = await getHelpSettings();

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
