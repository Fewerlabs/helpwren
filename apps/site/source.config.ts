import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

import { PUBLIC_DOCS } from "./src/lib/docs-files";
import { descriptionOf, remarkDocsPage, titleOf } from "./src/lib/docs-markdown";

/**
 * The docs are the repository's own `docs/` Markdown, read where it is, so there is one copy
 * that reads well on GitHub and on the site. A page needs no frontmatter: its title is its first
 * heading and its description its first paragraph, unless frontmatter says otherwise.
 */
export const docs = defineDocs({
  dir: "../../docs",
  docs: {
    files: [...PUBLIC_DOCS],
    schema: ({ source }) =>
      pageSchema.extend({
        title: z.string().default(titleOf(source)),
        description: z.string().default(descriptionOf(source)),
      }),
  },
  meta: {
    // The order of the sidebar: one meta.json at the top and one in each published folder.
    files: [
      "meta.json",
      ...PUBLIC_DOCS.filter((entry) => entry.endsWith("/**")).map(
        (entry) => `${entry.slice(0, -3)}/meta.json`,
      ),
    ],
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkDocsPage],
    // The docs' only images are badges hosted elsewhere, such as Vercel's deploy button. They are
    // shown as they are, so the build never fetches them to measure them.
    remarkImageOptions: false,
    rehypeCodeOptions: {
      themes: { light: "github-light-default", dark: "github-dark-default" },
    },
  },
});
