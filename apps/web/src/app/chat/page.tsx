import type { Metadata } from "next";

import { ChatPage, chatPageTitle } from "@/features/chat";
import { getHelpwren } from "@/lib/helpwren";

export async function generateMetadata(): Promise<Metadata> {
  const helpwren = await getHelpwren();
  // The page is the install's own, so its name stands alone in the tab.
  return { title: { absolute: chatPageTitle(await helpwren.settings.getPublic()) } };
}

/**
 * The chat on a page of its own, for a link in an email, a profile or a QR code, where there
 * is no site to put the widget on.
 */
export default async function Page() {
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getPublic();
  return (
    <div className="flex min-h-dvh flex-col">
      <ChatPage settings={settings} />
    </div>
  );
}
