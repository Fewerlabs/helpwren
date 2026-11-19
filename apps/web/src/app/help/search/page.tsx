import { EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";

import {
  ArticleList,
  Breadcrumbs,
  HELP_PATH,
  HelpHeader,
  helpMetadata,
} from "@/features/help-center";
import { getHelpSettings, searchHelpArticles } from "@/lib/help-center-data";
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
  const [settings, results, embed] = await Promise.all([
    getHelpSettings(),
    query ? searchHelpArticles(query) : Promise.resolve([]),
    getHelpEmbed(),
  ]);

  return (
    <>
      <HelpHeader settings={settings} variant="inner" query={query} embed={embed} />
      <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <Breadcrumbs
          crumbs={[
            { label: "Help center", href: withEmbed(HELP_PATH, embed) },
            { label: "Search" },
          ]}
        />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
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
              description="Try fewer or different words, or browse the collections from the help center's home."
            />
          ) : (
            <p className="text-muted-foreground">Type what you are looking for in the box above.</p>
          )}
        </div>
      </main>
    </>
  );
}
