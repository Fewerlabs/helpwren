"use client";

import { Logo } from "@helpwren/design-system";
import { RootProvider } from "fumadocs-ui/provider/next";
import { lazy, type ComponentProps, type ReactNode } from "react";

import { DeferredThemeMenu } from "@/components/deferred";

const DocsSearchDialog = lazy(() =>
  import("./docs-search").then((module) => ({ default: module.DocsSearchDialog })),
);

/**
 * Fumadocs' provider, with search loaded on first use. The theme is the site's own (the design
 * system's), so Fumadocs' theme provider is off.
 */
export function DocsProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ SearchDialog: DocsSearchDialog, preload: false }}
    >
      {children}
    </RootProvider>
  );
}

/** The name at the top of the sidebar: the logo, which goes home, and "Docs". */
export function DocsNavTitle({ className, ...props }: ComponentProps<"a">) {
  return (
    <span className="flex items-center gap-2">
      <a {...props} href="/" className={className} aria-label="Helpwren, home">
        <Logo variant="lockup" size={24} label="" />
      </a>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <a href="/docs" className="text-sm font-medium hover:underline">
        Docs
      </a>
    </span>
  );
}

const themeButton =
  "text-muted-foreground hover:text-foreground hover:bg-muted grid size-9 place-items-center rounded-lg";

/** A sun in light and a moon in dark, drawn here so the icon set is not needed to paint. */
function ThemeStandIn() {
  return (
    <span aria-hidden="true" className={themeButton}>
      <svg
        viewBox="0 0 24 24"
        className="size-4 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="hidden size-4 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </span>
  );
}

/** The site's own theme menu, so the choice is shared with the home page. */
export function DocsThemeSwitch() {
  return (
    <DeferredThemeMenu
      side="top"
      align="start"
      className={themeButton}
      fallback={<ThemeStandIn />}
    />
  );
}
