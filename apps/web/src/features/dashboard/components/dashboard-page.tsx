"use client";

import { cn, Icon, type IconName } from "@helpwren/design-system";
import Link from "next/link";
import { type ReactNode } from "react";

export interface PageNavItem {
  href: string;
  label: string;
  icon?: IconName;
  /** A number shown at the end of the row, such as how many conversations a view holds. */
  count?: number | undefined;
  active: boolean;
}

export interface DashboardPageProps {
  /** The section's name, at the top of its navigation. */
  title: string;
  /** The section's own pages or views. Leave it out for a section with only one. */
  nav?: readonly PageNavItem[];
  /** Names the navigation for assistive technology, such as "Inbox views". */
  navLabel?: string;
  /** Classes for the surface, such as the grid that lays out its columns. */
  className?: string;
  children: ReactNode;
}

/**
 * The frame of every dashboard section: its own navigation on the canvas, then one white
 * surface that holds the work. On a phone the navigation becomes a row above the surface.
 */
export function DashboardPage({ title, nav, navLabel, className, children }: DashboardPageProps) {
  return (
    <div className="flex h-full max-md:flex-col">
      {nav ? (
        <aside className="flex shrink-0 flex-col gap-1 p-2 max-md:pb-0 md:w-48 md:pr-0">
          <h1 className="flex h-9 items-center px-2 text-sm font-semibold max-md:hidden">
            {title}
          </h1>
          <nav
            aria-label={navLabel ?? title}
            className="flex gap-px max-md:overflow-x-auto md:flex-col"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "focus-visible:outline-ring flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 transition-colors focus-visible:outline-2",
                  item.active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    weight={item.active ? "fill" : "regular"}
                    className="size-4"
                  />
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.count === undefined ? null : (
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 p-2">
        <div
          className={cn(
            "border-rule dark:bg-background h-full overflow-hidden rounded-xl border bg-white",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
