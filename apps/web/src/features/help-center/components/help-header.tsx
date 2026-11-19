import { type PublicSettings } from "@helpwren/core";
import { cn, Icon, Logo } from "@helpwren/design-system";
import Link from "next/link";
import { type ReactNode } from "react";

import { embedQuery, type HelpEmbed } from "@/lib/help-embed";

import { HELP_PATH } from "../urls";
import { ThemeToggle } from "./theme-toggle";

const DEFAULT_PLACEHOLDER = "Search for articles";

export interface SearchBoxProps {
  settings: PublicSettings;
  /** What was searched for, kept in the box on the results page. */
  query?: string | undefined;
  /** `lg` is the one under the greeting; `sm` sits in the top bar. */
  size: "sm" | "lg";
  embed?: HelpEmbed | null | undefined;
  className?: string;
}

/** The help center's search, as a plain form: it works before any script has loaded. */
export function SearchBox({ settings, query, size, embed, className }: SearchBoxProps) {
  const placeholder = settings.helpCenter.searchPlaceholder ?? DEFAULT_PLACEHOLDER;
  const large = size === "lg";
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
        className={cn(
          "border-rule bg-card text-foreground placeholder:text-muted-foreground focus:border-ring focus-visible:outline-ring w-full border outline-offset-2 transition-colors focus-visible:outline-2 [&::-webkit-search-cancel-button]:hidden",
          large ? "h-12 rounded-xl pr-4 pl-12 text-base" : "h-9 rounded-lg pr-3 pl-9 text-sm",
        )}
      />
    </form>
  );
}

export interface HelpHeaderProps {
  settings: PublicSettings;
  query?: string | undefined;
  /** Leaves the search out of the bar, on the home page, where a large one sits under the greeting. */
  search?: boolean;
  /** The button that opens the list of articles on a narrow screen, at the start of the bar. */
  browse?: ReactNode;
}

/**
 * The bar across the top of every help center page, which stays in place while the page
 * scrolls: the customer's mark and name, their own links, the search and the theme button.
 */
export function HelpHeader({ settings, query, search = true, browse }: HelpHeaderProps) {
  const { brand, helpCenter } = settings;
  return (
    <header className="border-rule bg-card/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:gap-5">
        {browse}
        <Link
          href={HELP_PATH}
          className="focus-visible:outline-ring flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- from the install's own storage, whose host the optimiser does not know
            <img
              src={brand.logo}
              alt=""
              className="h-7 w-auto max-w-28 rounded-md object-contain"
            />
          ) : (
            <Logo variant="mark" size={24} label="" className="text-brand" />
          )}
          <span className="truncate">{brand.name}</span>
          <span className="text-muted-foreground font-normal max-sm:hidden">Help center</span>
        </Link>

        <nav aria-label="Site" className="flex items-center gap-1 text-sm max-md:hidden">
          {helpCenter.headerLinks.map((link) => (
            <a
              key={`${link.label}:${link.url}`}
              href={link.url}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-md px-2.5 py-1.5 transition-colors focus-visible:outline-2"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {search ? (
            <SearchBox settings={settings} query={query} size="sm" className="w-64 max-md:hidden" />
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
