import { docs } from "collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";

import { DOCS_BASE, REPO_BRANCH, REPO_URL } from "./docs-files";

/** Every published page of the docs, with the sidebar's tree. */
export const docsSource = loader({
  baseUrl: DOCS_BASE,
  source: docs.toFumadocsSource(),
});

export type DocsPage = InferPageType<typeof docsSource>;

/** The page's file in the repository, as the "Edit on GitHub" link opens it. */
export function editUrl(page: DocsPage): string {
  return `${REPO_URL}/edit/${REPO_BRANCH}/docs/${page.path}`;
}

/** The address of a page's sharing image, generated at build by `app/og/docs`. */
export function ogImageUrl(page: DocsPage): string {
  return ["/og/docs", ...page.slugs, "image.png"].join("/");
}
