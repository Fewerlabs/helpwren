import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";
import { docsSource } from "@/lib/docs-source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    ...docsSource.getPages().map((page) => ({
      url: `${SITE_URL}${page.url}`,
      changeFrequency: "weekly" as const,
      priority: page.slugs.length === 0 ? 0.9 : 0.7,
    })),
  ];
}
