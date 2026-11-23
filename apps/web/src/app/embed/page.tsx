import type { Metadata } from "next";

import { Chat, frameTheme, frameThemeScript } from "@/features/chat";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Chat" };

const DEFAULT_SOURCE = "web";

export default async function EmbedPage({ searchParams }: PageProps<"/embed">) {
  const { source, preview, theme } = await searchParams;
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getPublic();
  // Light unless the page or app asked for dark or the device's setting.
  const themeScript = frameThemeScript(frameTheme(theme));

  return (
    <main>
      {themeScript ? <script dangerouslySetInnerHTML={{ __html: themeScript }} /> : null}
      <Chat
        settings={settings}
        source={typeof source === "string" ? source : DEFAULT_SOURCE}
        preview={preview === "1"}
      />
    </main>
  );
}
