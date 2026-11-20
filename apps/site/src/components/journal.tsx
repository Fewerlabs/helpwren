import {
  cn,
  Sketch,
  WrenBird,
  type IllustrationMotion,
  type WrenPose,
} from "@helpwren/design-system";
import type { CSSProperties, ReactNode } from "react";

import { EntryMotion } from "@/motion/entry-motion";

/*
 * The pieces of the field journal. Each mark carries a data-mark attribute so the motion layer
 * can find it and draw it in; without the motion layer every mark is drawn and complete.
 */

export interface EntryProps {
  /** The section's id and the name of the wren's perch in it. */
  id: string;
  /** "01" to "09", or "Last". */
  number: string;
  /** The subject, in the header: "Install". */
  subject: string;
  /** The "where and when" line, a label, never invented data. */
  note: string;
  /** The entry's title, an h2. */
  title: ReactNode;
  /** The written page. */
  children: ReactNode;
  /** The drawn page, beside the writing on a wide screen and below it on a phone. */
  sketch?: ReactNode;
  /** Puts the sketch on the left of a spread. */
  flip?: boolean;
  className?: string;
  /** Classes for the sheet itself, such as a taller minimum height for a pinned entry. */
  sheetClassName?: string;
  /** Behind the entry's content. */
  backdrop?: ReactNode;
  /** Holds the entry on screen while the wren works through it (only while the wren flies). */
  pin?: boolean;
  /** Below the spread, across the page: more figures. */
  after?: ReactNode;
}

/**
 * One journal entry, written straight on the page: its number and field note in the margin, a
 * hand-drawn rule under them, then the writing and the drawing side by side as a spread.
 */
export function Entry({
  id,
  number,
  subject,
  note,
  title,
  children,
  sketch,
  flip = false,
  className,
  sheetClassName,
  backdrop,
  pin = false,
  after,
}: EntryProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-entry={id}
      data-pin={pin ? "" : undefined}
      className={cn("relative isolate px-4 py-12 sm:py-16", className)}
    >
      {backdrop}
      <EntryMotion />
      <div className={cn("pin-inner relative mx-auto max-w-5xl", sheetClassName)}>
        <div
          className={cn(
            "grid grid-cols-1 items-center gap-10",
            sketch ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16" : "",
          )}
        >
          <div className={cn("min-w-0", flip && sketch ? "lg:order-2" : "")}>
            <EntryRule number={number} subject={subject} note={note} />
            <h2
              id={headingId}
              data-split
              className="mt-8 text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.75rem]"
            >
              {title}
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-base leading-normal sm:text-lg">
              {children}
            </div>
          </div>
          {sketch ? (
            <figure
              className={cn(
                "relative flex min-w-0 flex-col items-center",
                flip ? "lg:order-1" : "",
              )}
            >
              {sketch}
              <figcaption className="font-hand text-muted-foreground mt-3 text-lg">
                fig. {number === "Last" ? "∞" : String(Number(number))}
              </figcaption>
            </figure>
          ) : null}
        </div>
        {after}
      </div>
    </section>
  );
}

/**
 * The top of an entry: a large entry number in the margin, the field note beside it, and a rule
 * drawn by hand across the page under them.
 */
export function EntryRule({
  number,
  subject,
  note,
}: {
  number: string;
  subject: string;
  note: string;
}) {
  return (
    <div>
      <div className="flex items-end gap-4">
        <span
          aria-hidden="true"
          className="text-muted-foreground font-mono text-4xl leading-none font-light sm:text-6xl"
        >
          {number === "Last" ? "—" : number}
        </span>
        <EntryHeader number={number} subject={subject} note={note} />
      </div>
      <Sketch
        viewBox="0 0 1000 14"
        preserveAspectRatio="none"
        rough={false}
        className="mt-3 h-3.5"
        data-sketch="rule"
      >
        <path
          pathLength={1}
          vectorEffect="non-scaling-stroke"
          d="M2 8C120 5 240 10 380 7 520 4 640 10 780 6 880 4 950 8 998 6"
        />
      </Sketch>
    </div>
  );
}

/** The field note that opens an entry: `ENTRY 03 · INSTALL · ONE SNIPPET`. */
export function EntryHeader({
  number,
  subject,
  note,
}: {
  number: string;
  subject: string;
  note: string;
}) {
  return (
    <p className="text-muted-foreground text-2xs font-mono tracking-[0.12em] uppercase">
      <span>{number === "Last" ? "Last entry" : `Entry ${number}`}</span>
      <span aria-hidden="true"> · </span>
      <span>{subject}</span>
      <span aria-hidden="true"> · </span>
      <span>{note}</span>
    </p>
  );
}

/** A word circled in red pen. The circle is drawn; the word stays plain text. */
export function PenCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        fill="none"
        className="pointer-events-none absolute -inset-x-[8%] -top-[22%] -bottom-[18%] h-[140%] w-[116%] overflow-visible"
      >
        <path
          data-mark="pen"
          pathLength={1}
          d="M8 22C6 8 40 3 70 5 95 7 99 20 92 30 82 39 30 40 12 33 4 29 3 20 14 13"
          stroke="var(--pen)"
          strokeWidth={1.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** A highlighter swipe behind a word. The swipe is its own layer so it can grow from the left. */
export function HighlighterMark({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden="true"
        data-mark="highlighter"
        className="bg-highlighter absolute inset-x-[-0.12em] top-[0.52em] bottom-[0.04em] -z-10 origin-left -rotate-1 rounded-sm"
      />
      <span className="highlighted">{children}</span>
    </span>
  );
}

/** Something taped into the journal with two strips of highlighter tape. */
export function Taped({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" data-mark="tape" className="tape -top-2.5 -left-3 -rotate-6" />
      <span
        aria-hidden="true"
        data-mark="tape"
        className="tape -right-3 -bottom-2.5 rotate-[4deg]"
      />
      {children}
    </div>
  );
}

/** A museum specimen tag: a name and one line, on a string. */
export function SpecimenTag({
  name,
  nameId,
  children,
  className,
}: {
  name: string;
  /** An id for the name, for something labelled by it. */
  nameId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-mark="tag"
      className={cn(
        "bg-card border-edge border-line relative rounded-xl py-3 pr-4 pl-9 text-left",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-muted-foreground absolute top-3 left-2.5 size-5"
      >
        <circle cx="9" cy="9" r="3" />
        <path d="M7 7C4 4 2 3 1 1" strokeLinecap="round" />
      </svg>
      <p id={nameId} className="text-foreground font-mono text-xs tracking-[0.08em] uppercase">
        {name}
      </p>
      <p className="text-muted-foreground mt-1 text-sm leading-snug">{children}</p>
    </div>
  );
}

/**
 * Where the wren lands in an entry. Without the flight, a still wren stands here. The parent is
 * a size container (`@container`), so the wren scales with the drawing it stands in.
 */
export function Perch({
  name,
  x,
  y,
  size = 20,
  facing = "right",
  pose = "perched",
  react,
  animate = "in-view",
}: {
  name: string;
  /** Across the parent, in percent. */
  x: number;
  /** Down the parent, in percent: where the wren's feet touch. */
  y: number;
  /** The wren's width, in percent of the parent's width. */
  size?: number;
  facing?: "left" | "right";
  /** How the still wren stands here. */
  pose?: WrenPose;
  /** Change it to make the still wren hop, as a reaction. */
  react?: number | undefined;
  /** How the still wren draws itself: with its drawing as it scrolls into view, by default. */
  animate?: IllustrationMotion;
}) {
  const style: CSSProperties = { left: `${String(x)}%`, top: `${String(y)}%` };
  return (
    <span
      aria-hidden="true"
      data-wren-perch={name}
      data-facing={facing}
      data-pose={pose}
      className="pointer-events-none absolute size-0"
      style={style}
    >
      <span
        data-still-wren
        className="absolute block"
        style={{
          width: `${String(size)}cqw`,
          height: `${String(size)}cqw`,
          // The mark's feet are at 51% across and 88% down its box.
          left: `${String(-size * FOOT_X)}cqw`,
          top: `${String(-size * FOOT_Y)}cqw`,
          transform: facing === "left" ? "scaleX(-1)" : undefined,
        }}
      >
        <WrenBird pose={pose} animate={animate} react={react} className="size-full" />
      </span>
    </span>
  );
}

/** Where the wren's feet are in the mark's box, as fractions across and down. */
export const FOOT_X = 0.51;
export const FOOT_Y = 0.88;

/** A handwritten label with a leader line, beside a drawing. */
export function HandLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn("font-hand text-muted-foreground text-lg leading-none", className)}
      data-mark="label"
    >
      {children}
    </span>
  );
}
