import { type Collection } from "@helpwren/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { refreshHelpCenter } from "../actions";

/** The start of every help center query's key, so one refresh reaches them all. */
export const ARTICLES_QUERY_KEY = ["articles"] as const;

/**
 * The collections, in order. A hook and not a `QueryList`, because no one component owns them:
 * the navigation lists them, the table names them, and the forms offer them as choices.
 */
export function useCollections() {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...ARTICLES_QUERY_KEY, "collections"],
    queryFn: () => getClient().collections.list(),
  });
}

/** How many articles there are, for the navigation. */
export function useArticleCounts() {
  const getClient = useHelpwren();
  return useQuery({
    queryKey: [...ARTICLES_QUERY_KEY, "counts"],
    queryFn: () => getClient().articles.counts(),
  }).data;
}

const COLLECTION = "collection";
/** Stands for "articles in no collection" in the address. No collection can have this slug. */
export const NO_COLLECTION = "none";
export const HELP_PATH = "/dashboard/help";

/** What the table is showing: everything, one collection, or the articles in none. */
export type Shown =
  { kind: "all" } | { kind: "none" } | { kind: "collection"; collection: Collection };

export function collectionHref(slug?: string): string {
  return slug ? `${HELP_PATH}?${COLLECTION}=${slug}` : HELP_PATH;
}

/** The empty editor for a new article, which starts in the collection given, if any. */
export function newArticleHref(slug?: string): string {
  return slug ? `${HELP_PATH}/new?${COLLECTION}=${slug}` : `${HELP_PATH}/new`;
}

/** The slug of the collection in the address, if there is one. */
export function useCollectionSlug(): string | null {
  return useSearchParams().get(COLLECTION);
}

/**
 * The collection in the address (`/dashboard/help?collection=billing`), so a reload and a
 * shared link land in the same place. An unknown slug shows everything.
 */
export function useShown(collections: readonly Collection[] | undefined): Shown {
  const slug = useCollectionSlug();
  if (slug === NO_COLLECTION) return { kind: "none" };
  const collection = collections?.find((item) => item.slug === slug);
  return collection ? { kind: "collection", collection } : { kind: "all" };
}

/**
 * Call after anything in the help center changes: it reloads every list on this screen, and
 * the public help center.
 */
export function useArticlesChanged() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEY }),
      // The public help center keeps what it reads for a minute; this tells it to read again.
      refreshHelpCenter(),
    ]);
  }, [queryClient]);
}
