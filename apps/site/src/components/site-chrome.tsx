import { Logo, ThemeMenu } from "@helpwren/design-system";
import type { ReactNode } from "react";

import { Perch } from "@/components/journal";
import { links } from "@/content/site";

const navLink =
  "text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-md px-2 py-1 text-sm transition-colors focus-visible:outline-2";

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
          className="focus-visible:outline-ring rounded-md focus-visible:outline-2"
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
          <ThemeMenu className="text-muted-foreground hover:text-foreground hover:bg-muted size-9 rounded-lg" />
        </nav>
      </div>
    </header>
  );
}

/** The foot of every page, where the wren ends its day on a branch. */
export function SiteFooter({ motionToggle }: { motionToggle?: ReactNode }) {
  return (
    <footer className="px-4 pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="@container relative mx-auto w-full max-w-xs">
          <svg
            viewBox="0 0 200 60"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            aria-hidden="true"
            data-sketch="footer"
            className="sketch h-auto w-full"
          >
            <path data-draw d="M4 40C50 34 96 42 140 36 164 33 182 34 196 28" />
            <path
              data-draw
              stroke="var(--moss)"
              d="M150 35C156 26 165 23 174 24 170 32 160 36 150 35Z"
            />
          </svg>
          <Perch name="footer" x={46} y={62} size={22} />
        </div>
        <div className="border-rule text-muted-foreground mt-6 flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Helpwren is published by Fewer Labs under the{" "}
            <a href={links.licence} className="hover:text-foreground underline underline-offset-4">
              MIT licence
            </a>
            .
          </p>
          <div className="flex items-center gap-3">
            {motionToggle}
            <ThemeMenu
              side="top"
              className="hover:text-foreground hover:bg-muted size-9 rounded-lg"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
