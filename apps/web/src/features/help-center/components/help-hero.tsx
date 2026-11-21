import { type PublicSettings } from "@helpwren/core";
import { cn } from "@helpwren/design-system";

import { hides, type HelpEmbed } from "@/lib/help-embed";

import { bannerStyle, heroKind } from "../hero";
import { searchPlaceholder } from "./help-header";
import { PageHalftone } from "./page-halftone";
import { SearchBox } from "./search-box";

/**
 * The top of the home page: the greeting and a large search. Behind it, a soft wash of the
 * brand's colour, the customer's own picture as a banner, or nothing, as Branding says.
 *
 * Inside a host's frame it sits on the host's page with nothing behind it, and shows only the
 * parts the host kept.
 */
export function HelpHero({
  settings,
  embed = null,
}: {
  settings: PublicSettings;
  embed?: HelpEmbed | null;
}) {
  const { helpCenter } = settings;
  const kind = embed ? "plain" : heroKind(settings);
  const banner = kind === "image" && helpCenter.headerImage;
  const title = !hides(embed, "title");
  const subtitle = !hides(embed, "subtitle");
  const search = !hides(embed, "search");
  if (!title && !subtitle && !search) return null;

  return (
    <header
      className={cn("relative", banner && "rounded-3xl px-7 py-10 sm:px-10 sm:py-12")}
      style={banner ? bannerStyle(banner) : undefined}
    >
      {kind === "glow" ? (
        // A glow in the brand's colour that fades out with no edge, off the top corner.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-10 -z-10 h-72 w-[34rem] max-w-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--brand,var(--primary))_26%,transparent),transparent)] blur-2xl"
        />
      ) : null}
      {banner || embed ? null : <PageHalftone className="-inset-x-10 -top-14 h-96" />}
      {title ? (
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {helpCenter.title ?? "How can we help?"}
        </h1>
      ) : null}
      {subtitle ? (
        <p
          className={cn(
            "text-base text-pretty",
            title && "mt-3",
            banner ? "opacity-85" : "text-muted-foreground",
          )}
        >
          {helpCenter.intro ?? "Answers to common questions, written by our team."}
        </p>
      ) : null}
      {search ? (
        <SearchBox
          placeholder={searchPlaceholder(settings)}
          size="lg"
          embed={embed}
          className={cn((title || subtitle) && (embed ? "mt-5" : "mt-7"))}
        />
      ) : null}
    </header>
  );
}
