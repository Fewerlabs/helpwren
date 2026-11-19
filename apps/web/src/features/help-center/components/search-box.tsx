"use client";

import { cn, Icon, Kbd } from "@helpwren/design-system";
import { useSyncExternalStore, type KeyboardEvent } from "react";

import { embedQuery, type HelpEmbed } from "@/lib/help-embed";

import { useShowSearch } from "../store/search-store";
import { HELP_PATH } from "../urls";

export interface SearchBoxProps {
  placeholder: string;
  /** What was searched for, kept in the box on the results page. */
  query?: string | undefined;
  /** `lg` is the one under the greeting; `sm` sits in the top bar. */
  size: "sm" | "lg";
  /**
   * Set inside a host's frame. There the box stays a plain form: the search window would be a
   * window inside a frame, cramped and cut off.
   */
  embed?: HelpEmbed | null | undefined;
  className?: string;
}

/** True once the page's script has started. False on the server and before then. */
const useStarted = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

/**
 * A search box. Before the page's script has started, and inside a host's frame, it is a plain
 * form that goes to the results page, so it always works. Once started, pressing it, focusing
 * it or typing into it opens the search window, which finds articles as the reader types.
 */
export function SearchBox({ placeholder, query, size, embed, className }: SearchBoxProps) {
  const started = useStarted();
  const show = useShowSearch();
  const large = size === "lg";
  const instant = started && !embed;

  const openWith = (event: KeyboardEvent<HTMLInputElement>) => {
    // A letter typed into the box starts the search with that letter.
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      show(event.key);
    } else if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      show(query ?? "");
    }
  };

  return (
    <form action={`${HELP_PATH}/search`} role="search" className={cn("relative w-full", className)}>
      {/* Inside a frame, the results page has to be the embedded form too. */}
      {embed
        ? [...new URLSearchParams(embedQuery(embed))].map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <Icon
        name="magnifying-glass"
        className={cn(
          "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2",
          large ? "left-4 size-5" : "left-3 size-4",
        )}
      />
      <input
        type="search"
        name="q"
        defaultValue={query}
        aria-label={placeholder}
        placeholder={placeholder}
        autoComplete="off"
        // Once the window can open, the box only opens it: the typing happens there.
        readOnly={instant}
        aria-haspopup={instant ? "dialog" : undefined}
        onClick={
          instant
            ? () => {
                show(query ?? "");
              }
            : undefined
        }
        onKeyDown={instant ? openWith : undefined}
        className={cn(
          "border-rule bg-card text-foreground placeholder:text-muted-foreground focus:border-ring focus-visible:outline-ring w-full border outline-offset-2 transition-colors focus-visible:outline-2 [&::-webkit-search-cancel-button]:hidden",
          instant && "cursor-pointer",
          large ? "h-12 rounded-xl pr-16 pl-12 text-base" : "h-9 rounded-lg pr-12 pl-9 text-sm",
        )}
      />
      {instant ? (
        <Kbd
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 max-sm:hidden",
            large ? "right-4" : "right-2.5",
          )}
        >
          ⌘K
        </Kbd>
      ) : null}
    </form>
  );
}
