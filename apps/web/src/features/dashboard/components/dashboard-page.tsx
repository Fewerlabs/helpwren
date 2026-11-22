"use client";

import { cn, Icon, type IconName, type IconWeight } from "@helpwren/design-system";
import Link from "next/link";
import { Fragment, useEffect, useRef, type ReactNode } from "react";

/** How the navigation draws an item's icon, so one drawn by the item matches the others. */
export interface PageNavIconProps {
  weight: IconWeight;
  className: string;
}

export interface PageNavItem {
  href: string;
  label: string;
  /** One of the app's icons, or a function that draws another, such as a collection's own. */
  icon?: IconName | ((props: PageNavIconProps) => ReactNode);
  /** A number shown at the end of the row, such as how many conversations a view holds. */
  count?: number | undefined;
  active: boolean;
  /**
   * What can be done to the item itself, such as a collection's "⋯" menu. It shows at the end
   * of the row, beside the count, while the row is pointed at or focused, and not on a phone.
   */
  actions?: ReactNode;
  /** A heading shown above the first item of each group, such as "Workspace". */
  group?: string;
}

export interface DashboardPageProps {
  /** The section's name, at the top of its navigation. */
  title: string;
  /** The section's own pages or views. */
  nav: readonly PageNavItem[];
  /** Names the navigation for assistive technology, such as "Inbox views". */
  navLabel?: string;
  /** Something to do from the navigation, under its last item: a button such as "New collection". */
  navAction?: ReactNode;
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

/** An item's icon: filled in and coloured while its page is open. */
function navIcon({ icon, active }: PageNavItem): ReactNode {
  if (!icon) return null;
  const props: PageNavIconProps = {
    weight: active ? "duotone" : "regular",
    className: cn("size-4", active && "text-primary"),
  };
  return typeof icon === "function" ? icon(props) : <Icon name={icon} {...props} />;
}

/**
 * The frame of every dashboard section: one card holding the section's navigation, the list it
 * selects from where there is one, and the work, divided by hairlines. On a narrow screen the
 * navigation becomes a row above the rest.
 */
export function DashboardPage({
  title,
  nav,
  navLabel,
  navAction,
  list,
  listHiddenWhenNarrow = false,
  className,
  children,
}: DashboardPageProps) {
  const navRef = useRef<HTMLElement>(null);
  const activeHref = nav.find((item) => item.active)?.href;

  // On a phone the navigation is a row that scrolls sideways: the open page is brought to its
  // middle, so its neighbours on both sides stay in reach.
  useEffect(() => {
    const current = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const row = navRef.current;
    if (!current || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({
      left: current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeHref]);

  return (
    <div className="h-full p-2">
      {/* One surface for the whole section, divided by hairlines and not by gaps. */}
      <div
        className={cn(card, "divide-rule flex h-full max-md:flex-col max-md:divide-y md:divide-x")}
      >
        <div
          className={cn(
            "divide-rule flex shrink-0 max-md:flex-col max-md:divide-y md:divide-x",
            list ? "max-md:min-h-0 max-md:flex-1" : null,
            listHiddenWhenNarrow && "max-md:hidden",
          )}
        >
          <aside className="flex shrink-0 flex-col gap-1 p-2 md:w-48">
            <h1 className="flex h-9 items-center px-2 text-sm font-semibold">{title}</h1>
            <nav
              ref={navRef}
              aria-label={navLabel ?? title}
              // The row scrolls by touch; a scrollbar under it would only add a line.
              className="relative flex gap-px max-md:[scrollbar-width:none] max-md:overflow-x-auto md:flex-col max-md:[&::-webkit-scrollbar]:hidden"
            >
              {nav.map((item, index) => (
                <Fragment key={item.href}>
                  {item.group && item.group !== nav[index - 1]?.group ? (
                    <p className="text-muted-foreground text-2xs px-2 pt-3 pb-1 font-mono tracking-wider uppercase max-md:hidden">
                      {item.group}
                    </p>
                  ) : null}
                  <div className="group/item relative flex shrink-0">
                    <Link
                      href={item.href}
                      aria-current={item.active ? "page" : undefined}
                      className={cn(
                        "focus-visible:outline-ring flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 transition-colors focus-visible:outline-2",
                        item.active
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {navIcon(item)}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count === undefined ? null : (
                        <span
                          className={cn(
                            "text-muted-foreground text-xs font-normal tabular-nums",
                            // The count makes room for the actions when they show.
                            item.actions &&
                              "md:group-focus-within/item:mr-6 md:group-hover/item:mr-6 md:group-has-aria-expanded/item:mr-6",
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                    {item.actions ? (
                      <div className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 group-focus-within/item:opacity-100 group-hover/item:opacity-100 has-aria-expanded:opacity-100 max-md:hidden">
                        {item.actions}
                      </div>
                    ) : null}
                  </div>
                </Fragment>
              ))}
            </nav>
            {navAction ? <div className="max-md:hidden">{navAction}</div> : null}
          </aside>
          {list ? <div className="flex min-h-0 min-w-0 flex-col md:w-[18.5rem]">{list}</div> : null}
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            list && !listHiddenWhenNarrow && "max-md:hidden",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
