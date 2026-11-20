import { cn, WrenBird, type IllustrationMotion, type WrenPose } from "@helpwren/design-system";
import type { CSSProperties, ReactNode } from "react";

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
  /** Behind the sheet, such as the halftone. */
  backdrop?: ReactNode;
  /** The entry's motion component, which loads its animation once motion is allowed. */
  motion?: ReactNode;
}

/** One journal entry: a white sheet, a spread on a wide screen, with its header in the margin. */
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
  motion,
}: EntryProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-entry={id}
      className={cn("relative isolate px-4 py-10 sm:py-14", className)}
    >
      {backdrop}
      {motion}
      <div
        className={cn(
          "bg-card border-rule border-line relative mx-auto max-w-6xl rounded-2xl",
          sketch ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]" : "",
          sheetClassName,
        )}
      >
        <div className={cn("min-w-0 p-6 sm:p-10", flip && sketch ? "lg:order-3" : "")}>
          <EntryHeader number={number} subject={subject} note={note} />
          <h2
            id={headingId}
            data-split
            className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.5rem]"
          >
            {title}
          </h2>
          <div className="text-muted-foreground mt-4 space-y-4 text-base leading-normal">
            {children}
          </div>
        </div>
        {sketch ? (
          <>
            <div aria-hidden="true" className="bg-rule hidden lg:order-2 lg:block" />
            <div
              className={cn(
                "border-rule relative flex items-center justify-center border-t p-6 sm:p-10 lg:border-t-0",
                flip ? "lg:order-1" : "lg:order-3",
              )}
            >
              {sketch}
            </div>
          </>
        ) : null}
      </div>
    </section>
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
  children,
  className,
}: {
  name: string;
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
      <p className="text-foreground font-mono text-xs tracking-[0.08em] uppercase">{name}</p>
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
  react?: number;
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
