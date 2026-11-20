"use client";

import { gsap, ScrollTrigger, SplitText } from "./kit";

/*
 * The journal's shared motion: headings rising line by line, tags and tape settling. The drawings
 * draw themselves with the design system's own CSS (Wren, Sketch, WrenBird with
 * animate="in-view"), so they need none of this. Every helper animates only transforms and
 * opacity, and plays once as its part of the page comes into view.
 */

export const DURATION = {
  heading: 0.6,
  rise: 0.5,
  tape: 0.3,
} as const;

export const STAGGER = { lines: 0.08, items: 0.08 } as const;

export const EASE = {
  out: "power3.out",
  pop: "back.out(2)",
} as const;

/** Where a part of the page counts as "in view" and starts playing: 88% down the screen. */
export const ENTRY_START = "top 88%";

/** True when the element is already on screen, or above it, so animating it would flash. */
export function alreadySeen(element: Element): boolean {
  return element.getBoundingClientRect().top < window.innerHeight * 0.9;
}

/**
 * A timeline that plays once when `trigger` comes into view. When the trigger is already on
 * screen as the motion layer starts, it returns null and the page stays as it was drawn.
 */
export function entryTimeline(trigger: Element, start = ENTRY_START): gsap.core.Timeline | null {
  if (alreadySeen(trigger)) return null;
  return gsap.timeline({
    scrollTrigger: { trigger, start, once: true },
  });
}

/** Things that rise into place: tags, cards, labels. */
export function riseIn(
  timeline: gsap.core.Timeline,
  items: readonly Element[],
  position: gsap.Position = "<",
) {
  if (items.length === 0) return;
  timeline.from(
    items,
    { y: 14, opacity: 0, duration: DURATION.rise, ease: EASE.out, stagger: STAGGER.items },
    position,
  );
}

/** Tape pressed down on something taped in. */
export function tapeDown(
  timeline: gsap.core.Timeline,
  strips: readonly Element[],
  position: gsap.Position = ">",
) {
  if (strips.length === 0) return;
  timeline.from(
    strips,
    { scale: 1.4, opacity: 0, duration: DURATION.tape, ease: EASE.pop, stagger: STAGGER.items },
    position,
  );
}

/**
 * A heading that rises in line by line through a mask. SplitText labels the heading for screen
 * readers and re-splits when fonts or widths change; useGSAP reverts it with everything else.
 */
export function revealHeading(heading: Element) {
  if (alreadySeen(heading)) return;
  SplitText.create(heading, {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    // The tween is returned so SplitText can carry its progress over a re-split. A tween is
    // thenable, which this rule mistakes for a promise.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 100,
        duration: DURATION.heading,
        ease: EASE.out,
        stagger: STAGGER.lines,
        scrollTrigger: { trigger: heading, start: ENTRY_START, once: true },
      }),
  });
}

/** The usual entry: its heading rises, its tags and tape settle. */
export function revealEntry(section: HTMLElement) {
  const heading = section.querySelector("h2[data-split]");
  if (heading) revealHeading(heading);

  const tags = [...section.querySelectorAll("[data-mark='tag']")];
  const firstTag = tags[0];
  if (firstTag) {
    const timeline = entryTimeline(firstTag, "top 85%");
    if (timeline) riseIn(timeline, tags, 0);
  }

  for (const note of section.querySelectorAll("[data-slot='margin-note']")) {
    const timeline = entryTimeline(note, "top 90%");
    if (timeline) riseIn(timeline, [note], 0);
  }

  const strips = [...section.querySelectorAll("[data-mark='tape']")];
  const firstStrip = strips[0];
  if (firstStrip) {
    const timeline = entryTimeline(firstStrip, "top 85%");
    if (timeline) tapeDown(timeline, strips, 0);
  }
}

/** After a layout change (images, fonts, a pinned section), triggers must be measured again. */
export function refreshTriggers() {
  ScrollTrigger.refresh();
}
