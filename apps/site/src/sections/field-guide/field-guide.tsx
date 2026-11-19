import { Wren, type WrenScene } from "@helpwren/design-system";

import { EntryHeader, HandLabel, SpecimenTag } from "@/components/journal";

interface Specimen {
  id: string;
  name: string;
  text: string;
  label: string;
  scene?: WrenScene;
}

const specimens: readonly Specimen[] = [
  {
    id: "chat",
    name: "Live chat",
    text: "Visitors and logged-in users, with attachments, typing and online status.",
    label: "fig. 1: in conversation",
    scene: "conversations",
  },
  {
    id: "tickets",
    name: "Tickets",
    text: "Numbers, status, priority and an assignee, with internal notes only the team sees.",
    label: "fig. 2: carrying a ticket",
    scene: "ticket",
  },
  {
    id: "help-center",
    name: "Help center",
    text: "Collections, articles and search, built to rank and embeddable in your site.",
    label: "fig. 3: well read",
    scene: "help-articles",
  },
  {
    id: "mobile",
    name: "Mobile screen",
    text: "A support screen for React Native and Expo apps, with an unread badge.",
    label: "fig. 4: in the pocket",
  },
  {
    id: "notifications",
    name: "Notifications",
    text: "Push through Expo, Firebase or a webhook. Email, and replies by email back into the chat.",
    label: "fig. 5: calling back",
    scene: "notifications",
  },
  {
    id: "context",
    name: "Knows who's asking",
    text: "Identify users or verify them with a token. The team sees the page and live visitors.",
    label: "fig. 6: keeping watch",
    scene: "visitors",
  },
];

/** Entry 06: a field-guide plate of what Helpwren does, one specimen each. */
export function FieldGuide() {
  return (
    <section
      id="field-guide"
      aria-labelledby="field-guide-title"
      data-entry="field-guide"
      className="relative isolate px-4 py-10 sm:py-14"
    >
      <div
        aria-hidden="true"
        className="halftone top-0 left-1/2 h-full w-full -translate-x-1/2"
        data-corner="center"
      />
      <div className="bg-card border-rule border-line relative mx-auto max-w-6xl rounded-2xl p-6 sm:p-10">
        <span
          aria-hidden="true"
          data-wren-waypoint="field-guide"
          className="absolute top-[42%] left-1/2 size-0"
        />
        <EntryHeader number="06" subject="Field guide" note="Plate 1: behaviours" />
        <h2
          id="field-guide-title"
          data-split
          className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.5rem]"
        >
          What it does
        </h2>
        <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {specimens.map((specimen) => (
            <li key={specimen.id} data-specimen className="flex flex-col">
              <figure className="relative">
                {specimen.scene ? (
                  <Wren
                    scene={specimen.scene}
                    bird={false}
                    animate={false}
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
              <SpecimenTag name={specimen.name} className="mt-3">
                {specimen.text}
              </SpecimenTag>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A phone with a chat on its screen, drawn in the same line as the wren scenes. */
function PhoneSketch() {
  return (
    <svg
      viewBox="0 0 220 170"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="sketch mx-auto h-auto w-full max-w-56"
    >
      <rect data-draw x="78" y="14" width="64" height="130" rx="12" />
      <path data-draw d="M100 24H120" />
      <path
        data-draw
        d="M90 52H124C127 52 129 54 129 57V66C129 69 127 71 124 71H98L92 76V71H90C87 71 85 69 85 66V57C85 54 87 52 90 52Z"
      />
      <path
        data-draw
        stroke="var(--moss)"
        d="M100 84H130C133 84 135 86 135 89V98C135 101 133 103 130 103H128V108L122 103H100C97 103 95 101 95 98V89C95 86 97 84 100 84Z"
      />
      <path data-draw d="M100 132H120" />
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
    </svg>
  );
}
