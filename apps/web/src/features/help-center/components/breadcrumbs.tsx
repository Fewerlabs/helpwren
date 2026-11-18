import { Icon } from "@helpwren/design-system";
import Link from "next/link";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  /** Left out for the page itself, which is the last crumb and not a link. */
  href?: string;
}

/** The way back up: Help center, the collection, and the page a reader is on. */
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 ? (
              <li aria-hidden="true" className="flex">
                <Icon name="caret-right" className="size-3" />
              </li>
            ) : null}
            <li className="min-w-0">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground focus-visible:outline-ring rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground block max-w-64 truncate">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
