import { EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ArticleList,
  canonicalUrl,
  CollectionGrid,
  collectionPath,
  HelpHero,
  helpMetadata,
  HelpShell,
  JsonLd,
  searchPath,
} from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { hides, withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

export async function generateMetadata(): Promise<Metadata> {
  return helpMetadata(await getHelpSettings());
}

/** The help center's home: the greeting and search, every collection as a card, and the articles put forward. */
export default async function HelpHomePage() {
  const [settings, collections, embed] = await Promise.all([
    getHelpSettings(),
    getHelpCollections(),
    getHelpEmbed(),
  ]);
  // A host may ask the embedded help center to open somewhere other than its home.
  if (embed?.collection) redirect(withEmbed(collectionPath(embed.collection), embed));
  if (embed?.query) redirect(withEmbed(searchPath(embed.query), embed));
  const showCollections = !hides(embed, "collections");
  const featured = hides(embed, "popular")
    ? []
    : collections.flatMap((collection) =>
        collection.articles.filter((article) => article.featured),
      );

  return (
    <HelpShell settings={settings} collections={collections} embed={embed} home>
      <HelpHero settings={settings} embed={embed} />
      {collections.length === 0 ? (
        // The book and pencil alone: the wren is our mark, and this page wears theirs.
        <EmptyState
          scene="first-article"
          bird={false}
          headingLevel={2}
          className="mt-10 first:mt-0"
          title="Articles are on their way"
          description="There is nothing here yet. Check back soon."
        />
      ) : showCollections || featured.length > 0 ? (
        // Inside a frame with the heading and search left out, the cards start at the top.
        <div className={embed ? "mt-8 grid gap-8 first:mt-0" : "mt-10 grid gap-12"}>
          {showCollections ? (
            <section aria-labelledby="collections">
              <h2 id="collections" className="sr-only">
                Browse by topic
              </h2>
              <CollectionGrid collections={collections} embed={embed} />
            </section>
          ) : null}
          {featured.length > 0 ? (
            <section aria-labelledby="popular-articles">
              <h2 id="popular-articles" className="mb-3 text-lg font-semibold tracking-tight">
                Popular articles
              </h2>
              <ArticleList
                label="Popular articles"
                articles={featured}
                showCollection
                embed={embed}
              />
            </section>
          ) : null}
        </div>
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: `${settings.brand.name} Help Center`,
          url: canonicalUrl(settings),
          potentialAction: {
            "@type": "SearchAction",
            target: canonicalUrl(settings, searchPath("")).replace(/q=$/, "q={search_term_string}"),
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </HelpShell>
  );
}
