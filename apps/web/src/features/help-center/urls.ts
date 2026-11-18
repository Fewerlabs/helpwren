import { type PublicSettings } from "@helpwren/core";

import { env } from "@/lib/env";

/** Where the help center lives on this install. Links between its pages are relative to here. */
export const HELP_PATH = "/help";

export const collectionPath = (collection: string) => `${HELP_PATH}/${collection}`;
export const articlePath = (collection: string, article: string) =>
  `${HELP_PATH}/${collection}/${article}`;
export const searchPath = (query: string) => `${HELP_PATH}/search?q=${encodeURIComponent(query)}`;

/**
 * The one true address of a help center page, for search engines and shared links. When the
 * help center is served from another site through a rewrite, that site's address is used, so
 * the same page is never indexed under two addresses.
 */
export function canonicalUrl(settings: PublicSettings, path: string = HELP_PATH): string {
  const base =
    settings.helpCenter.url ?? `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${HELP_PATH}`;
  return `${base}${path.slice(HELP_PATH.length)}`;
}
