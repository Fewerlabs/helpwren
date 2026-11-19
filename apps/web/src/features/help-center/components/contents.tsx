"use client";

import { cn, type RichTextHeading } from "@helpwren/design-system";
import { useEffect, useState } from "react";

/**
 * An article's headings as links, with the one being read marked as the page scrolls. It works
 * as a plain list of links before any script has loaded.
 */
export function Contents({ headings }: { headings: readonly RichTextHeading[] }) {
  const [active, setActive] = useState(headings[0]?.id);

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element) => element !== null);
    // Without a way to watch the page scroll, the list is still a list of working links.
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return undefined;
    // The heading being read is the last one to have passed the top part of the screen.
    const observer = new IntersectionObserver(
      () => {
        const passed = targets.filter((target) => target.getBoundingClientRect().top < 140);
        setActive((passed.at(-1) ?? targets[0])?.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 1] },
    );
    for (const target of targets) observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [headings]);

  return (
    <ul className="border-rule grid border-l text-sm">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            aria-current={heading.id === active ? "location" : undefined}
            className={cn(
              "focus-visible:outline-ring -ml-px block border-l py-1.5 text-pretty transition-colors focus-visible:outline-2",
              heading.level > 2 ? "pl-7" : "pl-4",
              heading.id === active
                ? "border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
