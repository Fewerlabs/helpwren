import type { MetadataRoute } from "next";

import { articlePath, canonicalUrl, collectionPath } from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";

// Asked of the database when it is requested, never while building.
export const dynamic = "force-dynamic";

/**
 * Every page of the help center, for search engines: served at `/help/sitemap.xml`. Drafts and
 * articles shown only in the chat are not in it, because they are not on the help center.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, collections] = await Promise.all([getHelpSettings(), getHelpCollections()]);
  const latest = (dates: string[]) => dates.sort().at(-1);

  return [
    {
      url: canonicalUrl(settings),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...collections.flatMap((collection) => [
      {
        url: canonicalUrl(settings, collectionPath(collection.slug)),
        lastModified: latest(collection.articles.map((article) => article.updatedAt)),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
      ...collection.articles.map((article) => ({
        url: canonicalUrl(settings, articlePath(collection.slug, article.slug)),
        lastModified: article.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ]),
  ];
}
