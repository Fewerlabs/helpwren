import { Button, Icon, type IconName, MarginNote } from "@helpwren/design-system";

import { EntryHeader } from "@/components/journal";
import { links } from "@/content/site";
import { EntryMotion } from "@/motion/entry-motion";

const routes: readonly { href: string; label: string; text: string; icon: IconName }[] = [
  {
    href: links.github,
    label: "The repository",
    text: "Read the code, open an issue, star it.",
    icon: "github-logo",
  },
  {
    href: links.docs,
    label: "The docs",
    text: "The widget, mobile apps, architecture and decisions.",
    icon: "book-open",
  },
  {
    href: links.contributing,
    label: "Contributing",
    text: "How to set up, the conventions, and how to send a change.",
    icon: "users-three",
  },
];

/** The last entry: where to go next. The repository is an invitation to add your own entries. */
export function Join() {
  return (
    <section
      id="join"
      aria-labelledby="join-title"
      data-entry="join"
      className="relative isolate overflow-hidden px-4 pt-10 pb-6 sm:pt-14"
    >
      <EntryMotion />
      <div className="mx-auto max-w-6xl">
        <EntryHeader number="Last" subject="Join the survey" note="Open to everyone" />
        <h2
          id="join-title"
          data-split
          className="mt-3 max-w-2xl text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.5rem]"
        >
          Add your own sightings
        </h2>
        <p className="text-muted-foreground mt-4 max-w-xl text-base leading-normal">
          Helpwren is built in the open. Install it, read how it works, or help make it better.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <a href={links.install}>
              Install Helpwren
              <Icon name="arrow-right" className="size-4" />
            </a>
          </Button>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {routes.map((route) => (
            <li key={route.href}>
              <a
                href={route.href}
                className="bg-card border-border border-line hover:border-foreground focus-visible:outline-ring flex h-full flex-col gap-1.5 rounded-2xl p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Icon name={route.icon} className="text-primary size-5" />
                <span className="font-semibold">{route.label}</span>
                <span className="text-muted-foreground text-sm">{route.text}</span>
              </a>
            </li>
          ))}
        </ul>
        <MarginNote arrow="none" className="mt-8">
          more sightings in the repo
        </MarginNote>
      </div>
    </section>
  );
}
