import { Button, Icon } from "@helpwren/design-system";

import { EntryHeader, HighlighterMark, PenCircle, Perch } from "@/components/journal";
import { links } from "@/content/site";
import { formatCount, MIN_STARS_SHOWN } from "@/lib/github";
import { SceneSlot } from "@/scenes/scene-slot";

import { HeroSketch } from "./hero-sketch";

/** Entry 01, the first sighting: what Helpwren is, and the two ways in. */
export function Hero({ stars }: { stars: number | null }) {
  return (
    <section
      id="first-sighting"
      aria-labelledby="hero-title"
      data-entry="first-sighting"
      className="relative isolate overflow-hidden px-4 pt-8 pb-12 sm:pt-16 sm:pb-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <EntryHeader number="01" subject="First sighting" note="Open source" />
          <h1
            id="hero-title"
            data-split
            className="mt-4 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[3.5rem] lg:text-[4rem]"
          >
            Live chat that <PenCircle>plugs into</PenCircle> any product and lives in{" "}
            <HighlighterMark>your own database.</HighlighterMark>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-normal">
            Open source and self-hosted: live chat, tickets and a help center, with no per-seat
            pricing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <a href={links.install}>
                Install Helpwren
                <Icon name="arrow-right" className="size-4" />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={links.github}>
                <Icon name="github-logo" className="size-4" />
                View on GitHub
                {stars === null || stars < MIN_STARS_SHOWN ? null : (
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatCount(stars)} stars
                  </span>
                )}
              </a>
            </Button>
          </div>
        </div>
        <div className="@container relative mx-auto w-full max-w-md">
          <SceneSlot scene="hero">
            <HeroSketch />
          </SceneSlot>
          <Perch name="first-sighting" x={47} y={63} size={24} animate />
        </div>
      </div>
    </section>
  );
}
