import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/features/help-center";
import { getHelpSettings } from "@/lib/help-center-data";

// Asked of the database when it is requested, never while building.
export const dynamic = "force-dynamic";

/**
 * What search engines may read on this install: the help center and the chat page. The team's
 * screens, the chat frame, the API, search results and previews of drafts are not for them.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getHelpSettings();
  return {
    rules: {
      userAgent: "*",
      allow: ["/help", "/chat"],
      disallow: [
        "/dashboard",
        "/login",
        "/embed",
        "/api/",
        "/design",
        "/help/search",
        "/help/preview",
      ],
    },
    sitemap: `${canonicalUrl(settings)}/sitemap.xml`,
  };
}
