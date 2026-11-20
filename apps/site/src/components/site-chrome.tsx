import { Icon, Logo, Sketch } from "@helpwren/design-system";

import { DeferredMotionToggle, DeferredThemeMenu } from "@/components/deferred";
import { Perch } from "@/components/journal";
import { links } from "@/content/site";

const navLink =
  "text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-2";

const themeButton =
  "text-muted-foreground hover:text-foreground hover:bg-muted grid size-11 place-items-center rounded-lg";

/** The theme button as it looks before its menu's code has loaded: same size, same place. */
function ThemeStandIn({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={className}>
      {/* As the menu shows it: the theme on screen, a sun or a moon. */}
      <Icon name="sun" className="size-[1.125rem] dark:hidden" />
      <Icon name="moon" className="hidden size-[1.125rem] dark:block" />
    </span>
  );
}

/** The top of every page: the name, two links and the theme. */
export function SiteHeader() {
  return (
    <header className="relative z-10 px-4">
      <a
        href="#main"
        className="bg-card border-border border-line sr-only rounded-lg px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-3 focus:left-4"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
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

/** The foot of every page, where the wren ends its day on a branch. */
export function SiteFooter() {
  return (
    <footer className="px-4 pb-10">
      <div className="mx-auto max-w-6xl">
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
        <div className="border-rule text-muted-foreground mt-6 flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Helpwren is published by Fewer Labs under the{" "}
            <a href={links.licence} className="hover:text-foreground underline underline-offset-4">
              MIT licence
            </a>
            .
          </p>
          <div className="flex items-center gap-6">
            <DeferredMotionToggle fallback={<span className="block h-11 w-32" />} />
            <DeferredThemeMenu
              side="top"
              className={themeButton}
              fallback={<ThemeStandIn className={themeButton} />}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
