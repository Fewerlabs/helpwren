import { Icon } from "@helpwren/design-system";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ArticleList,
  Breadcrumbs,
  canonicalUrl,
  collectionPath,
  countArticles,
  HELP_PATH,
  HelpHeader,
  helpMetadata,
  iconOf,
  JsonLd,
} from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";

type Props = PageProps<"/help/[collection]">;

async function load(slug: string) {
  const [settings, collections] = await Promise.all([getHelpSettings(), getHelpCollections()]);
  return { settings, collection: collections.find((item) => item.slug === slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { settings, collection } = await load((await params).collection);
  if (!collection) return helpMetadata(settings, { title: "Page not found", noindex: true });
  return helpMetadata(settings, {
    title: collection.name,
    description: collection.description ?? undefined,
    path: collectionPath(collection.slug),
  });
}

/** One collection: what it is about, and its articles in the order the team set. */
export default async function HelpCollectionPage({ params }: Props) {
  const { settings, collection } = await load((await params).collection);
  if (!collection) notFound();

  return (
    <>
      <HelpHeader settings={settings} variant="inner" />
      <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <Breadcrumbs
          crumbs={[{ label: "Help center", href: HELP_PATH }, { label: collection.name }]}
        />
        <header className="mt-6 mb-8 flex items-start gap-4">
          <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-2xl">
            <Icon name={iconOf(collection.icon)} weight="duotone" className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {collection.name}
            </h1>
            {collection.description ? (
              <p className="text-muted-foreground mt-1.5 text-lg text-pretty">
                {collection.description}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-sm">
              {countArticles(collection.articles.length)}
            </p>
          </div>
        </header>
        <ArticleList label={`Articles in ${collection.name}`} articles={collection.articles} />
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Help center", item: canonicalUrl(settings) },
            {
              "@type": "ListItem",
              position: 2,
              name: collection.name,
              item: canonicalUrl(settings, collectionPath(collection.slug)),
            },
          ],
        }}
      />
    </>
  );
}
