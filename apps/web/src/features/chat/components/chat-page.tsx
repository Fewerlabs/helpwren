import { type PublicSettings } from "@helpwren/core";
import { cn, ThemeMenu } from "@helpwren/design-system";
import { type CSSProperties } from "react";

import { bannerStyle, PageHalftone } from "@/features/help-center";
import { brandProps } from "@/lib/accent";
import { BrandOnBody } from "@/lib/brand-on-body";

import { Chat } from "./chat";

/** The heading over the chat page, as the page and its browser tab both say it. */
export function chatPageTitle({ brand, chatPage }: PublicSettings): string {
  return chatPage.title ?? `Chat with ${brand.name}`;
}

/** What is behind the top of the page: a glow of the brand's colours, their picture, or nothing. */
type Backdrop = "glow" | "image" | "plain";

function backdrop({ chatPage }: PublicSettings): Backdrop {
  if (chatPage.headerStyle === "plain") return "plain";
  // A picture style with no picture falls back to the brand's colour.
  return chatPage.headerStyle === "image" && chatPage.headerImage ? "image" : "glow";
}

/** A soft wash of a colour that fades out with no edge. */
const wash = (colour: string, strength: number) =>
  `radial-gradient(closest-side, color-mix(in srgb, ${colour} ${strength}%, transparent), transparent)`;

/** The picture across the top, darkened for white words, fading into the page at its foot. */
function pictureStyle(image: string): CSSProperties {
  const fade = "linear-gradient(to bottom, #000 55%, transparent)";
  return { ...bannerStyle(image), maskImage: fade, WebkitMaskImage: fade };
}

export interface ChatPageProps {
  settings: PublicSettings;
  /** Draws the page as a new visitor sees it with nothing in it working, for the preview in Branding. */
  preview?: boolean;
  /** Classes for the chat's box, which sets its height. */
  chatClassName?: string;
}

/**
 * The chat on a page of its own, for a link in an email, a profile or a QR code: a heading over
 * the chat, on a band of the brand's colour, their picture, or nothing.
 */
export function ChatPage({ settings, preview = false, chatClassName }: ChatPageProps) {
  const { brand, chatPage } = settings;
  const kind = backdrop(settings);
  const image = kind === "image" ? chatPage.headerImage : undefined;
  // Helpwren's own green when the brand has no colour, as the Background choice shows it.
  const first = brand.accent ?? "var(--primary)";
  const second = brand.accent && brand.accentTo ? brand.accentTo : first;

  return (
    <main
      inert={preview}
      className={cn(
        "bg-card text-foreground relative isolate flex min-h-full flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-4 sm:p-8",
      )}
      {...brandProps(brand)}
    >
      <BrandOnBody brand={brand} />
      {/* The page is the install's own, so a reader can choose light or dark, as on the help
          center. Not in the preview, where the dashboard's own theme is in force. */}
      {preview ? null : (
        <ThemeMenu className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 size-9 rounded-lg sm:top-4 sm:right-4" />
      )}
      {kind === "glow" ? (
        // Two glows off the top corners, one in each of the brand's colours.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]"
        >
          <div
            className="absolute -top-40 -left-24 h-[28rem] w-[40rem] max-w-[90%] blur-3xl"
            style={{ background: wash(first, 48) }}
          />
          <div
            className="absolute -top-32 -right-24 h-[26rem] w-[36rem] max-w-[80%] blur-3xl"
            style={{ background: wash(second, 38) }}
          />
        </div>
      ) : null}
      {image ? null : <PageHalftone className="inset-x-0 top-0 h-[28rem]" />}
      {image ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-80"
          style={pictureStyle(image)}
        />
      ) : null}
      <header
        className="grid max-w-md gap-1 text-center"
        style={image ? { color: "#ffffff" } : undefined}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {chatPageTitle(settings)}
        </h1>
        <p className={cn("text-pretty", image ? "opacity-85" : "text-muted-foreground")}>
          {chatPage.intro ?? "Send us a message and we will reply here."}
        </p>
      </header>
      <div className="border-rule w-full max-w-md overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgb(16_26_21/0.12)]">
        <Chat
          settings={settings}
          source="web"
          preview={preview}
          className={chatClassName ?? "h-[min(42.5rem,calc(100dvh-12rem))]"}
        />
      </div>
    </main>
  );
}
