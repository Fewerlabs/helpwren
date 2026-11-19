import { type PublicSettings } from "@helpwren/core";
import { cn } from "@helpwren/design-system";

import { type HelpEmbed } from "@/lib/help-embed";

import { bannerStyle, heroKind } from "../hero";
import { SearchBox } from "./help-header";
import { PageGrid } from "./page-grid";

/**
 * The top of the home page: the greeting and a large search. Behind it, a soft wash of the
 * brand's colour, the customer's own picture as a banner, or nothing, as Branding says.
 */
export function HelpHero({ settings }: { settings: PublicSettings; embed?: HelpEmbed | null }) {
  const { helpCenter } = settings;
  const kind = heroKind(settings);
  const banner = kind === "image" && helpCenter.headerImage;

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
      {banner ? null : <PageGrid className="-inset-x-10 -top-14 h-96" />}
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {helpCenter.title ?? "How can we help?"}
      </h1>
      <p
        className={cn(
          "mt-3 text-base text-pretty",
          banner ? "opacity-85" : "text-muted-foreground",
        )}
      >
        {helpCenter.intro ?? "Answers to common questions, written by our team."}
      </p>
      <SearchBox settings={settings} size="lg" className="mt-7" />
    </header>
  );
}
