import { EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ArticleList,
  canonicalUrl,
  CollectionGrid,
  collectionPath,
  HelpHeader,
  helpMetadata,
  JsonLd,
  searchPath,
} from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

export async function generateMetadata(): Promise<Metadata> {
  return helpMetadata(await getHelpSettings());
}

/** The help center's home: the greeting and search, then every collection as a card. */
export default async function HelpHomePage() {
  const [settings, collections, embed] = await Promise.all([
    getHelpSettings(),
    getHelpCollections(),
    getHelpEmbed(),
  ]);
  // A host may ask the embedded help center to open somewhere other than its home.
  if (embed?.collection) redirect(withEmbed(collectionPath(embed.collection), embed));
  if (embed?.query) redirect(withEmbed(searchPath(embed.query), embed));
  const showCollections = !embed?.hide.includes("collections");
  const featured = collections.flatMap((collection) =>
    collection.articles.filter((article) => article.featured),
  );

  return (
    <>
      <HelpHeader settings={settings} variant="home" embed={embed} />
      <main
        className={
          embed
            ? "mx-auto w-full max-w-3xl px-4 py-5"
            : "mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14"
        }
      >
        {collections.length === 0 ? (
          // The book and pencil alone: the wren is our mark, and this page wears theirs.
          <EmptyState
            scene="first-article"
            bird={false}
            headingLevel={2}
            title="Articles are on their way"
            description="There is nothing here yet. Check back soon."
          />
        ) : (
          <div className="grid gap-12">
            {showCollections ? (
              <section aria-labelledby="collections">
                <h2 id="collections" className="sr-only">
                  Browse by topic
                </h2>
                <CollectionGrid collections={collections} embed={embed} />
              </section>
            ) : null}
            {featured.length > 0 ? (
              <section aria-labelledby="popular-articles" className="mx-auto w-full max-w-3xl">
                <h2 id="popular-articles" className="mb-4 text-xl font-semibold tracking-tight">
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
        )}
      </main>
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
    </>
  );
}
