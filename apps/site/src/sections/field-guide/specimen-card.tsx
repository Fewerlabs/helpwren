import { Sketch, Wren, type WrenScene } from "@helpwren/design-system";

import { HandLabel, SpecimenTag } from "@/components/journal";

export interface Specimen {
  id: string;
  name: string;
  text: string;
  label: string;
  /** The docs page about it. */
  href: string;
  scene?: WrenScene;
}

/**
 * One figure on the field-guide plate. The figure draws itself in once as it scrolls into view
 * and then rests. The whole card links to the docs page about it.
 */
export function SpecimenCard({ specimen }: { specimen: Specimen }) {
  const titleId = `specimen-${specimen.id}`;
  return (
    <li data-specimen aria-labelledby={titleId} className="group relative flex flex-col">
      <figure className="relative">
        {specimen.scene ? (
          <Wren
            scene={specimen.scene}
            bird={false}
            animate="in-view"
            decorative
            className="mx-auto max-w-56"
          />
        ) : (
          <PhoneSketch />
        )}
        <figcaption className="mt-1 text-center">
          <HandLabel>{specimen.label}</HandLabel>
        </figcaption>
      </figure>
      <SpecimenTag
        name={specimen.name}
        nameId={titleId}
        className="group-hover:border-foreground mt-3 transition-colors"
      >
        {specimen.text}
      </SpecimenTag>
      {/* The link covers the card, so the figure and the tag both lead to the docs. */}
      <a
        href={specimen.href}
        className="focus-visible:outline-ring absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <span className="sr-only">{specimen.name}: read the docs</span>
      </a>
    </li>
  );
}

/** A phone with a chat on its screen and an unread badge, in the wren scenes' line. */
function PhoneSketch() {
  return (
    <Sketch viewBox="0 0 220 170" className="mx-auto max-w-56">
      <rect pathLength={1} x="78" y="14" width="64" height="130" rx="12" />
      <path pathLength={1} d="M100 24H120" />
      <path
        pathLength={1}
        d="M90 52H124C127 52 129 54 129 57V66C129 69 127 71 124 71H98L92 76V71H90C87 71 85 69 85 66V57C85 54 87 52 90 52Z"
      />
      <path
        pathLength={1}
        stroke="var(--moss)"
        d="M100 84H130C133 84 135 86 135 89V98C135 101 133 103 130 103H128V108L122 103H100C97 103 95 101 95 98V89C95 86 97 84 100 84Z"
      />
      <path pathLength={1} d="M100 132H120" />
      <g className="hw-pop">
        <circle cx="140" cy="18" r="7" fill="var(--pen)" stroke="none" />
        <text
          x="140"
          y="21"
          textAnchor="middle"
          stroke="none"
          fill="var(--card)"
          className="font-mono text-[8px]"
        >
          1
        </text>
      </g>
    </Sketch>
  );
}
