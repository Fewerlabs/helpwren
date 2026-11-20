import { Icon, Logo, Sketch } from "@helpwren/design-system";

import { DeferredMotionToggle, DeferredThemeMenu } from "@/components/deferred";
import { HeaderScroll } from "@/components/header-scroll";
import { Perch } from "@/components/journal";
import { GITHUB_URL, links } from "@/content/site";

const blob = (path: string) => `${GITHUB_URL}/blob/main/${path}`;

const navLink =
  "text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-2";

const themeButton =
  "text-muted-foreground hover:text-foreground hover:bg-muted grid size-11 place-items-center rounded-lg";

/** The theme button as it looks before its menu's code has loaded: same size, same place. */
function ThemeStandIn({ className }: { className: string }) {
  return (
    // A real button, so the keyboard can reach it: focusing or pressing it loads the menu, and
    // a press is passed on to the menu once it is there.
    <button type="button" aria-label="Theme" className={className}>
      {/* As the menu shows it: the theme on screen, a sun or a moon. */}
      <Icon name="sun" className="size-[1.125rem] dark:hidden" />
      <Icon name="moon" className="hidden size-[1.125rem] dark:block" />
    </button>
  );
}

/**
 * The top of every page: the name, two links and the theme. It stays at the top while the page
 * scrolls, on the paper, above the flying wren; a hairline shows under it once the page moves.
 */
export function SiteHeader() {
  return (
    <header
      data-site-header
      className="page-gutters bg-card/90 data-[scrolled]:border-rule sticky top-0 z-40 border-b border-transparent px-4 backdrop-blur-md motion-safe:transition-colors"
    >
      <HeaderScroll />
      <a
        href="#main"
        className="bg-card border-border border-line sr-only rounded-lg px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-3 focus:left-4"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4">
        <a
          href="/"
          className="focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md focus-visible:outline-2"
          aria-label="Helpwren, home"
        >
          <Logo variant="lockup" size={28} label="" />
        </a>
        <nav aria-label="Main" className="flex items-center gap-1">
          <a href={links.docs} className={navLink}>
            Docs
          </a>
          <a href={links.github} className={navLink}>
            GitHub
          </a>
          <DeferredThemeMenu
            className={themeButton}
            fallback={<ThemeStandIn className={themeButton} />}
          />
        </nav>
      </div>
    </header>
  );
}

const footLink =
  "text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md text-sm transition-colors focus-visible:outline-2";

/**
 * The foot of every page: one quiet row under the branch where the wren ends its day asleep.
 * The name and the licence on the left; four links and the animations switch on the right.
 */
export function SiteFooter() {
  return (
    <footer className="page-gutters px-4 pb-8">
      <div className="mx-auto max-w-5xl">
        {/* The last entry: a branch, and the wren asleep on it. */}
        <div className="@container relative mx-auto w-full max-w-xs">
          <Sketch viewBox="0 0 200 60" data-sketch="footer">
            <path pathLength={1} d="M4 40C50 34 96 42 140 36 164 33 182 34 196 28" />
            <path
              pathLength={1}
              stroke="var(--moss)"
              d="M150 35C156 26 165 23 174 24 170 32 160 36 150 35Z"
            />
          </Sketch>
          <Perch name="footer" x={46} y={62} size={22} pose="asleep" />
        </div>
        <div className="border-rule text-muted-foreground mt-6 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href="/"
              aria-label="Helpwren, home"
              className="focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md focus-visible:outline-2"
            >
              <Logo variant="lockup" size={22} label="" />
            </a>
            <p>
              © 2026 Fewer Labs ·{" "}
              <a
                href={links.licence}
                className="hover:text-foreground underline underline-offset-4"
              >
                MIT licence
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5">
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5">
              <a href={links.docs} className={footLink}>
                Docs
              </a>
              <a href={links.github} className={footLink}>
                GitHub
              </a>
              <a href={blob("CHANGELOG.md")} className={footLink}>
                Changelog
              </a>
              <a href={blob("SECURITY.md")} className={footLink}>
                Security
              </a>
            </nav>
            <DeferredMotionToggle fallback={<span className="block h-11 w-28" />} />
          </div>
        </div>
      </div>
    </footer>
  );
}
