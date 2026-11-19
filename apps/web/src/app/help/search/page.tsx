import { EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";
import Link from "next/link";

import { ArticleList, HELP_PATH, helpMetadata, HelpShell } from "@/features/help-center";
import { getHelpCollections, getHelpSettings, searchHelpArticles } from "@/lib/help-center-data";
import { withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

type Props = PageProps<"/help/search">;

/** The words searched for, from the address. A repeated `q` counts once. */
async function readQuery(searchParams: Props["searchParams"]): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? (q[0] ?? "") : (q ?? "")).trim().slice(0, 200);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await readQuery(searchParams);
  return helpMetadata(await getHelpSettings(), {
    title: query ? `Results for "${query}"` : "Search",
    path: `${HELP_PATH}/search`,
    // A page per search is endless and says nothing an article does not say better.
    noindex: true,
  });
}

/** What a search of the help center found, best match first. */
export default async function HelpSearchPage({ searchParams }: Props) {
  const query = await readQuery(searchParams);
  const [settings, collections, results, embed] = await Promise.all([
    getHelpSettings(),
    getHelpCollections(),
    query ? searchHelpArticles(query) : Promise.resolve([]),
    getHelpEmbed(),
  ]);

  return (
    <HelpShell settings={settings} collections={collections} query={query} embed={embed}>
      <Link
        href={withEmbed(HELP_PATH, embed)}
        className="text-primary focus-visible:outline-ring mb-2 inline-block rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
      >
        Help center
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {query ? `Results for "${query}"` : "Search the help center"}
      </h1>
      {query ? (
        <p className="text-muted-foreground mt-2" role="status">
          {results.length === 0
            ? "No articles found."
            : results.length === 1
              ? "1 article found."
              : `${results.length} articles found.`}
        </p>
      ) : null}

      <div className="mt-8">
        {results.length > 0 ? (
          <ArticleList label="Search results" articles={results} showCollection embed={embed} />
        ) : query ? (
          <EmptyState
            scene="no-results"
            bird={false}
            headingLevel={2}
            title="Nothing matched those words"
            description="Try fewer or different words, or browse the collections."
          />
        ) : (
          <p className="text-muted-foreground">Type what you are looking for in the search box.</p>
        )}
      </div>
    </HelpShell>
  );
}
