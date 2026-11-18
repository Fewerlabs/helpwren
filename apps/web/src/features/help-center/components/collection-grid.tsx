import { type ArticleSummary, type Collection } from "@helpwren/core";
import { ArticleCard, Icon, type IconName, iconNames } from "@helpwren/design-system";
import Link from "next/link";

import { countArticles } from "../format";
import { articlePath, collectionPath } from "../urls";

/** A collection's icon, or the book when it names one this version does not have. */
export function iconOf(name: string): IconName {
  return (iconNames as readonly string[]).includes(name) ? (name as IconName) : "book-open";
}

export interface CollectionGridProps {
  collections: readonly (Collection & { articles: readonly ArticleSummary[] })[];
}

/** The collections as cards: an icon, a name, a line about it and how many articles it holds. */
export function CollectionGrid({ collections }: CollectionGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <li key={collection.id} className="grid">
          <ArticleCard
            href={collectionPath(collection.slug)}
            icon={iconOf(collection.icon)}
            title={collection.name}
            {...(collection.description ? { summary: collection.description } : {})}
            meta={countArticles(collection.articles.length)}
          />
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
}

/** Articles as rows in one outlined box, divided by hairlines. Each row is a link. */
export function ArticleList({ label, articles, showCollection = false }: ArticleListProps) {
  return (
    <ul
      aria-label={label}
      className="border-rule bg-card divide-rule divide-y overflow-hidden rounded-2xl border"
    >
      {articles.map((article) =>
        article.collection ? (
          <li key={article.id}>
            <Link
              href={articlePath(article.collection.slug, article.slug)}
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
