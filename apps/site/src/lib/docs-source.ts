import { type InferPageType, loader } from "fumadocs-core/source";

import { docs } from "collections/server";

import { DOCS_BASE } from "./docs-files";

/** Every published page of the docs, with the sidebar's tree. */
export const docsSource = loader({
  baseUrl: DOCS_BASE,
  source: docs.toFumadocsSource(),
});

export type DocsPage = InferPageType<typeof docsSource>;

/** The address of a page's sharing image, generated at build by `app/og/docs`. */
export function ogImageUrl(page: DocsPage): string {
  return ["/og/docs", ...page.slugs, "image.png"].join("/");
}
