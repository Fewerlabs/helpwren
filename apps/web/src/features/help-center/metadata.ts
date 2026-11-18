import { type PublicSettings } from "@helpwren/core";
import type { Metadata } from "next";

import { canonicalUrl, HELP_PATH } from "./urls";

export interface HelpPage {
  /** The page's own title, without the brand's name. Left out for the home page. */
  title?: string | undefined;
  description?: string | undefined;
  /** The page's path on this install, such as `/help/billing`. */
  path?: string;
  /** For an article: when it was first published and last changed. */
  article?: { publishedAt: string | null; updatedAt: string };
  /** Keeps the page out of search engines: search results, and previews of drafts. */
  noindex?: boolean;
}

/**
 * What a help center page tells browsers, search engines and anything that shows a link to it:
 * its title, description, one true address, and how to draw it as a card when shared. All of
 * it is in the customer's name, never Helpwren's.
 */
export function helpMetadata(settings: PublicSettings, page: HelpPage = {}): Metadata {
  const { brand, helpCenter } = settings;
  const site = `${brand.name} Help Center`;
  const title = page.title ? `${page.title} | ${site}` : (helpCenter.seoTitle ?? site);
  const description =
    page.description ??
    helpCenter.seoDescription ??
    helpCenter.intro ??
    `Answers to common questions about ${brand.name}.`;
  const url = canonicalUrl(settings, page.path ?? HELP_PATH);

  return {
    // Absolute, so the app's own "· Helpwren" is not added to a customer's page.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: page.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: page.title ?? title,
      description,
      url,
      siteName: site,
      type: page.article ? "article" : "website",
      ...(page.article
        ? {
            modifiedTime: page.article.updatedAt,
            ...(page.article.publishedAt ? { publishedTime: page.article.publishedAt } : {}),
          }
        : {}),
      ...(brand.logo ? { images: [{ url: brand.logo, alt: brand.name }] } : {}),
    },
    twitter: { card: "summary", title: page.title ?? title, description },
    ...(brand.logo ? { icons: { icon: brand.logo } } : {}),
  };
}
