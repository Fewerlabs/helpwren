import { EntryHeader } from "@/components/journal";
import { EntryMotion } from "@/motion/entry-motion";

import { SpecimenCard, type Specimen } from "./specimen-card";

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
      className="relative isolate px-4 py-12 sm:py-16"
    >
      <EntryMotion />
      {/* A field-guide plate: a double ink frame, the plate's number above, figures inside. */}
      <div className="border-foreground/70 bg-card relative mx-auto max-w-5xl border p-1.5">
        <div className="border-foreground/30 relative border p-6 sm:p-10">
          <div className="text-center">
            <EntryHeader number="06" subject="Field guide" note="Plate I: behaviours" />
            <h2
              id="field-guide-title"
              data-split
              className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.75rem]"
            >
              What it does
            </h2>
          </div>
          <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {specimens.map((specimen) => (
              <SpecimenCard key={specimen.id} specimen={specimen} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
