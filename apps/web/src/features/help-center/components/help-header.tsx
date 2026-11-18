import { type PublicSettings } from "@helpwren/core";
import { cn, Icon, Logo } from "@helpwren/design-system";
import Link from "next/link";

import { heroStyle } from "../hero";
import { HELP_PATH } from "../urls";
import { ThemeToggle } from "./theme-toggle";

export interface HelpHeaderProps {
  settings: PublicSettings;
  /**
   * `home` is the tall band with the greeting and a large search. `inner` is the slim band on
   * every other page, with the search beside the name.
   */
  variant: "home" | "inner";
  /** What was searched for, kept in the box on the results page. */
  query?: string;
  /**
   * Draws the header without its links working, for the preview in Branding, where following
   * one would leave the form.
   */
  inert?: boolean;
}

const DEFAULT_PLACEHOLDER = "Search for articles";

function SearchBox({
  settings,
  query,
  large,
}: {
  settings: PublicSettings;
  query?: string | undefined;
  large: boolean;
}) {
  const placeholder = settings.helpCenter.searchPlaceholder ?? DEFAULT_PLACEHOLDER;
  return (
    // A plain form: searching works before any script has loaded, and without one.
    <form action={`${HELP_PATH}/search`} role="search" className="relative w-full">
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
          "bg-card text-foreground placeholder:text-muted-foreground focus-visible:outline-ring w-full border border-transparent outline-offset-2 focus-visible:outline-2 [&::-webkit-search-cancel-button]:hidden",
          large
            ? "h-14 rounded-2xl pr-5 pl-12 text-base shadow-[0_8px_30px_rgb(38_35_30/0.12)]"
            : "h-10 rounded-xl pr-3 pl-9 text-sm",
        )}
      />
    </form>
  );
}

/** The brand's mark and name, which lead back to the help center's home. */
function Brand({ settings }: { settings: PublicSettings }) {
  const { brand } = settings;
  return (
    <Link
      href={HELP_PATH}
      className="focus-visible:outline-ring flex min-w-0 items-center gap-2.5 rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {brand.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- from the install's own storage, whose host the optimiser does not know
        <img src={brand.logo} alt="" className="h-8 w-auto max-w-32 rounded-md object-contain" />
      ) : (
        <Logo variant="mark" size={28} label="" className="text-current" />
      )}
      <span className="truncate">{brand.name}</span>
      <span className="opacity-70 max-sm:hidden">Help center</span>
    </Link>
  );
}

/**
 * The top of every help center page, in the brand's colours: its mark and name, its own links,
 * and the search. On the home page it also carries the greeting.
 */
export function HelpHeader({ settings, variant, query, inert = false }: HelpHeaderProps) {
  const { helpCenter } = settings;
  const hero = heroStyle(settings);
  const home = variant === "home";

  return (
    <header
      inert={inert}
      style={hero.style}
      className={cn("relative", hero.plain && "border-rule bg-background border-b")}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Brand settings={settings} />
        {home ? null : (
          <div className="mx-auto w-full max-w-md max-md:hidden">
            <SearchBox settings={settings} query={query} large={false} />
          </div>
        )}
        <nav
          aria-label="Site"
          className={cn("flex shrink-0 items-center gap-1 text-sm", home && "ml-auto")}
        >
          {helpCenter.headerLinks.map((link) => (
            <a
              key={`${link.label}:${link.url}`}
              href={link.url}
              className="focus-visible:outline-ring rounded-lg px-2.5 py-1.5 font-medium opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 max-sm:hidden"
            >
              {link.label}
            </a>
          ))}
          <ThemeToggle />
        </nav>
      </div>

      {home ? (
        <div className="mx-auto max-w-2xl px-5 pt-10 pb-16 text-center sm:pt-14 sm:pb-20">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {helpCenter.title ?? "How can we help?"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-pretty opacity-80">
            {helpCenter.intro ?? "Answers to common questions, written by our team."}
          </p>
          <div className="mt-8">
            <SearchBox settings={settings} large />
          </div>
        </div>
      ) : (
        // On a phone the search has a row of its own under the name.
        <div className="px-5 pb-4 md:hidden">
          <SearchBox settings={settings} query={query} large={false} />
        </div>
      )}
    </header>
  );
}
