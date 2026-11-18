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
  /** The section's own pages or views. */
  nav: readonly PageNavItem[];
  /** Names the navigation for assistive technology, such as "Inbox views". */
  navLabel?: string;
  /**
   * A column that belongs with the navigation, in the same card: the list a view selects from,
   * such as the inbox's conversations.
   */
  list?: ReactNode;
  /** Hides the navigation and list on a narrow screen, while something from the list is open. */
  listHiddenWhenNarrow?: boolean;
  /** Classes for the main card, such as the grid that lays out its columns. */
  className?: string;
  children: ReactNode;
}

const card = "border-rule bg-card overflow-hidden rounded-xl border";

/**
 * The frame of every dashboard section. One card holds the section's navigation and, where
 * there is one, the list it selects from; a second card holds the work. On a narrow screen the
 * navigation becomes a row above the list.
 */
export function DashboardPage({
  title,
  nav,
  navLabel,
  list,
  listHiddenWhenNarrow = false,
  className,
  children,
}: DashboardPageProps) {
  return (
    <div className="flex h-full gap-2 p-2 max-md:flex-col">
      <div
        className={cn(
          card,
          "divide-rule flex shrink-0 max-md:flex-col max-md:divide-y md:divide-x",
          list ? "max-md:min-h-0 max-md:flex-1" : null,
          listHiddenWhenNarrow && "max-md:hidden",
        )}
      >
        <aside className="flex shrink-0 flex-col gap-1 p-2 md:w-48">
          <h1 className="flex h-9 items-center px-2 text-sm font-semibold">{title}</h1>
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
                    weight={item.active ? "duotone" : "regular"}
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
        {list ? <div className="flex min-h-0 min-w-0 flex-col md:w-[18.5rem]">{list}</div> : null}
      </div>
      <div
        className={cn(
          card,
          "min-h-0 min-w-0 flex-1",
          list && !listHiddenWhenNarrow && "max-md:hidden",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
