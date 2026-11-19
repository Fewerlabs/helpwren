import { type ArticleSummary, type Collection } from "@helpwren/core";
import { Icon, type IconName, iconNames } from "@helpwren/design-system";
import Link from "next/link";

import { withEmbed, type HelpEmbed } from "@/lib/help-embed";

import { articlePath, collectionPath } from "../urls";

/** A collection's icon, or the book when it names one this version does not have. */
export function iconOf(name: string): IconName {
  return (iconNames as readonly string[]).includes(name) ? (name as IconName) : "book-open";
}

export interface CollectionGridProps {
  collections: readonly (Pick<Collection, "id" | "name" | "slug" | "description" | "icon"> & {
    articles: readonly unknown[];
  })[];
  /** Set inside a host's frame, so each link stays in the embedded form. */
  embed?: HelpEmbed | null;
}

/**
 * The collections as cards, two to a row: an icon beside the name, a line about it and how
 * many articles it holds. Soft and filled, so a page of them reads as one quiet block.
 */
export function CollectionGrid({ collections, embed = null }: CollectionGridProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {collections.map((collection) => (
        <li key={collection.id} className="grid">
          <Link
            href={withEmbed(collectionPath(collection.slug), embed)}
            className="group bg-muted/50 hover:border-rule hover:bg-muted focus-visible:outline-ring flex flex-col rounded-2xl border border-transparent p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="flex items-center gap-2.5 font-semibold">
              <Icon
                name={iconOf(collection.icon)}
                weight="duotone"
                className="text-brand size-5 shrink-0"
              />
              <span className="text-pretty">{collection.name}</span>
            </span>
            {collection.description ? (
              <span className="text-muted-foreground mt-2 line-clamp-3 text-sm text-pretty">
                {collection.description}
              </span>
            ) : null}
            <span className="text-muted-foreground mt-auto pt-4 text-xs">
              <span className="text-foreground font-medium tabular-nums">
                {collection.articles.length}
              </span>{" "}
              {collection.articles.length === 1 ? "article" : "articles"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface ArticleListProps {
  /** Names the list for assistive technology, such as "Articles in Billing". */
  label: string;
  articles: readonly ArticleSummary[];
  /** Shows which collection each article is in, for a list that mixes them. */
  showCollection?: boolean;
  /** Set inside a host's frame, so each link stays in the embedded form. */
  embed?: HelpEmbed | null;
}

/** Articles as rows in one outlined box, divided by hairlines. Each row is a link. */
export function ArticleList({
  label,
  articles,
  showCollection = false,
  embed = null,
}: ArticleListProps) {
  return (
    <ul
      aria-label={label}
      className="border-rule bg-card divide-rule divide-y overflow-hidden rounded-2xl border"
    >
      {articles.map((article) =>
        article.collection ? (
          <li key={article.id}>
            <Link
              href={withEmbed(articlePath(article.collection.slug, article.slug), embed)}
              className="group hover:bg-muted/50 focus-visible:outline-ring flex items-center gap-4 px-5 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <span className="min-w-0 flex-1">
                {showCollection ? (
                  <span className="text-muted-foreground text-2xs block font-mono tracking-wide uppercase">
                    {article.collection.name}
                  </span>
                ) : null}
                <span className="block font-medium text-pretty">{article.title}</span>
                {article.summary ? (
                  <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-sm">
                    {article.summary}
                  </span>
                ) : null}
              </span>
              <Icon
                name="caret-right"
                className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}
