import { Icon } from "@helpwren/design-system";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArticleList,
  canonicalUrl,
  collectionPath,
  countArticles,
  HELP_PATH,
  helpMetadata,
  HelpShell,
  iconOf,
  JsonLd,
} from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { withEmbed } from "@/lib/help-embed";
import { getHelpEmbed } from "@/lib/help-embed-request";

type Props = PageProps<"/help/[collection]">;

async function load(slug: string) {
  const [settings, collections] = await Promise.all([getHelpSettings(), getHelpCollections()]);
  return { settings, collections, collection: collections.find((item) => item.slug === slug) };
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
  const [{ settings, collections, collection }, embed] = await Promise.all([
    load((await params).collection),
    getHelpEmbed(),
  ]);
  if (!collection) notFound();

  return (
    <HelpShell
      settings={settings}
      collections={collections}
      current={{ collection: collection.slug }}
      embed={embed}
    >
      <Link
        href={withEmbed(HELP_PATH, embed)}
        className="text-primary focus-visible:outline-ring mb-2 inline-block rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
      >
        Help center
      </Link>
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-balance">
          <Icon
            name={iconOf(collection.icon)}
            weight="duotone"
            className="text-primary size-7 shrink-0"
          />
          {collection.name}
        </h1>
        {collection.description ? (
          <p className="text-muted-foreground mt-2.5 text-lg text-pretty">
            {collection.description}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-3 text-sm">
          {countArticles(collection.articles.length)}
        </p>
      </header>
      <ArticleList
        label={`Articles in ${collection.name}`}
        articles={collection.articles}
        embed={embed}
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
              name: collection.name,
              item: canonicalUrl(settings, collectionPath(collection.slug)),
            },
          ],
        }}
      />
    </HelpShell>
  );
}
