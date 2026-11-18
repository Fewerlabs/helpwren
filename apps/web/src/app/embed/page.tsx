import type { Metadata } from "next";

import { Chat } from "@/features/chat";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Chat" };

const DEFAULT_SOURCE = "web";

export default async function EmbedPage({ searchParams }: PageProps<"/embed">) {
  const { source } = await searchParams;
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getPublic();

  return (
    <main>
      <Chat settings={settings} source={typeof source === "string" ? source : DEFAULT_SOURCE} />
    </main>
  );
}
