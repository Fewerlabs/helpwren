import { cn } from "@helpwren/design-system";
import Link from "next/link";

import { articlePath, collectionPath } from "../urls";
import { SidebarGroup } from "./sidebar-group";

/** A collection as the sidebar lists it: its name and the titles under it. */
export interface NavCollection {
  id: string;
  name: string;
  slug: string;
  icon: string;
  articles: readonly { id: string; title: string; slug: string }[];
}

export interface HelpSidebarProps {
  collections: readonly NavCollection[];
  /** The slugs of the collection and the article on screen, to mark where the reader is. */
  current?: { collection?: string | undefined; article?: string | undefined } | undefined;
}

/** With more articles than this in all, only the collection being read starts open. */
const OPEN_ALL_UP_TO = 24;

/**
 * The whole help center at a glance: every collection, with its articles under it, and the
 * page the reader is on marked. Each collection folds open and shut. A small help center shows everything;
 * a large one opens only the collection being read, so the list stays short enough to scan.
 */
export function HelpSidebar({ collections, current }: HelpSidebarProps) {
  const total = collections.reduce((sum, collection) => sum + collection.articles.length, 0);

  return (
    <nav aria-label="All articles" className="grid gap-1.5 text-sm">
      {collections.map((collection) => {
        const here = current?.collection === collection.slug;
        return (
          <SidebarGroup
            key={collection.id}
            name={collection.name}
            icon={collection.icon}
            count={collection.articles.length}
            defaultOpen={here || total <= OPEN_ALL_UP_TO}
          >
            <ul className="border-rule mt-1 mb-3 ml-4 grid gap-px border-l pl-2">
              <li>
                <Link
                  href={collectionPath(collection.slug)}
                  aria-current={here && !current.article ? "page" : undefined}
                  className={cn(
                    "focus-visible:outline-ring block rounded-md px-2 py-1.5 transition-colors focus-visible:outline-2",
                    here && !current.article
                      ? "bg-brand/10 text-brand font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  Overview
                </Link>
              </li>
              {collection.articles.map((article) => {
                const active = here && current.article === article.slug;
                return (
                  <li key={article.id}>
                    <Link
                      href={articlePath(collection.slug, article.slug)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-visible:outline-ring block rounded-md px-2 py-1.5 text-pretty transition-colors focus-visible:outline-2",
                        active
                          ? "bg-brand/10 text-brand font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {article.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SidebarGroup>
        );
      })}
    </nav>
  );
}
