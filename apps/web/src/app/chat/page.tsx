import type { Metadata } from "next";

import { Chat } from "@/features/chat";
import { accentStyle, brandFill } from "@/lib/accent";
import { getHelpwren } from "@/lib/helpwren";

export async function generateMetadata(): Promise<Metadata> {
  const helpwren = await getHelpwren();
  const { brand, chatPage } = await helpwren.settings.getPublic();
  // The page is the install's own, so its name stands alone in the tab.
  return { title: { absolute: chatPage.title ?? `Chat with ${brand.name}` } };
}

/**
 * The chat on a page of its own, for a link in an email, a profile or a QR code, where there
 * is no site to put the widget on.
 */
export default async function ChatPage() {
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getPublic();
  const { brand, chatPage } = settings;

  return (
    <main
      className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-6 p-4 sm:p-8"
      style={accentStyle(brand)}
    >
      {/* A band of the brand's colour behind the top of the page, when it has one. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-0 h-64"
        style={{ background: brandFill(brand) ?? "var(--muted)" }}
      />
      <header
        className={
          brand.accent
            ? "text-primary-foreground relative grid max-w-md gap-1 text-center"
            : "relative grid max-w-md gap-1 text-center"
        }
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          {chatPage.title ?? `Chat with ${brand.name}`}
        </h1>
        <p className="opacity-80">
          {chatPage.intro ?? "Send us a message and we will reply here."}
        </p>
      </header>
      <div className="border-rule relative w-full max-w-md overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgb(38_35_30/0.12)]">
        <Chat settings={settings} source="web" className="h-[min(42.5rem,calc(100dvh-12rem))]" />
      </div>
    </main>
  );
}
