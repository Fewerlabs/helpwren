import { richTextToPlainText } from "@helpwren/core";
import { richTextHeadings } from "@helpwren/design-system";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  articlePath,
  ArticleView,
  canonicalUrl,
  collectionPath,
  Contents,
  helpMetadata,
  HelpShell,
  JsonLd,
} from "@/features/help-center";
import { getHelpArticle, getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

type Props = PageProps<"/help/[collection]/[article]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [settings, article] = await Promise.all([
    getHelpSettings(),
    getHelpArticle((await params).article),
  ]);
  if (!article?.collection) {
    return helpMetadata(settings, { title: "Page not found", noindex: true });
  }
  return helpMetadata(settings, {
    title: article.metaTitle ?? article.title,
    description:
      article.metaDescription ?? article.summary ?? richTextToPlainText(article.body).slice(0, 160),
    path: articlePath(article.collection.slug, article.slug),
    article: { publishedAt: article.publishedAt, updatedAt: article.updatedAt },
  });
}

/** One article, as anyone on the web reads it. */
export default async function HelpArticlePage({ params }: Props) {
  const { collection: collectionSlug, article: slug } = await params;
  const [settings, article, collections, embed] = await Promise.all([
    getHelpSettings(),
    getHelpArticle(slug),
    getHelpCollections(),
    getHelpEmbed(),
  ]);
  if (!article?.collection) notFound();
  // An article has one address. Reached under another collection's name, say after it was
  // moved, it sends the reader and the search engine on to the right one.
  if (article.collection.slug !== collectionSlug) {
    permanentRedirect(withEmbed(articlePath(article.collection.slug, article.slug), embed));
  }

  const siblings = collections.find((item) => item.id === article.collectionId)?.articles ?? [];
  const place = siblings.findIndex((item) => item.id === article.id);
  const headings = richTextHeadings(article.body);
  const url = canonicalUrl(settings, articlePath(article.collection.slug, article.slug));
  const organisation = {
    "@type": "Organization",
    name: settings.brand.name,
    ...(settings.brand.logo ? { logo: settings.brand.logo } : {}),
  };

  return (
    <HelpShell
      settings={settings}
      collections={collections}
      current={{ collection: article.collection.slug, article: article.slug }}
      embed={embed}
      aside={
        // Two headings make a table of contents; one is only the article's own outline.
        headings.length >= 2 ? (
          <nav aria-label="On this page">
            <p className="mb-3 text-sm font-semibold">On this page</p>
            <Contents headings={headings} />
          </nav>
        ) : null
      }
    >
      <ArticleView
        article={article}
        previous={place > 0 ? siblings[place - 1] : undefined}
        next={place >= 0 ? siblings[place + 1] : undefined}
        embed={embed}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          ...(article.summary ? { description: article.summary } : {}),
          ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
          dateModified: article.updatedAt,
          ...(article.tags.length > 0 ? { keywords: article.tags.join(", ") } : {}),
          author: organisation,
          publisher: organisation,
          mainEntityOfPage: url,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Help center", item: canonicalUrl(settings) },
            {
              "@type": "ListItem",
              position: 2,
              name: article.collection.name,
              item: canonicalUrl(settings, collectionPath(article.collection.slug)),
            },
            { "@type": "ListItem", position: 3, name: article.title, item: url },
          ],
        }}
      />
    </HelpShell>
  );
}
