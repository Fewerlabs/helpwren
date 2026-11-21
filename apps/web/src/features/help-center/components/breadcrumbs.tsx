import { Icon } from "@helpwren/design-system";
import Link from "next/link";
import { Fragment } from "react";

import { hides, withEmbed, type HelpEmbed } from "@/lib/help-embed";

import { HELP_PATH } from "../urls";

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

/**
 * The way back to the help center's home from a page one level down, such as a collection or a
 * search. On the site it is one link, as the list of articles beside the page shows the rest.
 * Inside a host's frame there is no such list, so it is the breadcrumb, unless the host hid it.
 */
export function HelpBackLink({ embed, here }: { embed: HelpEmbed | null; here: string }) {
  if (embed) {
    if (hides(embed, "breadcrumbs")) return null;
    return (
      <div className="mb-5">
        <Breadcrumbs
          crumbs={[{ label: "Help center", href: withEmbed(HELP_PATH, embed) }, { label: here }]}
        />
      </div>
    );
  }
  return (
    <Link
      href={HELP_PATH}
      className="text-primary focus-visible:outline-ring mb-2 inline-block rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
    >
      Help center
    </Link>
  );
}
