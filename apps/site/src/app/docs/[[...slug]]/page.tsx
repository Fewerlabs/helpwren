import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SITE_NAME } from "@/content/site";
import { REPO_BRANCH } from "@/lib/docs-files";
import { docsSource, ogImageUrl } from "@/lib/docs-source";

export const dynamic = "force-static";
export const dynamicParams = false;

interface DocsRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function DocsRoute({ params }: DocsRouteProps) {
  const page = docsSource.getPage((await params).slug);
  if (!page) notFound();
  const Body = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{ style: "clerk" }}
      editOnGithub={{
        owner: "Fewerlabs",
        repo: "helpwren",
        sha: REPO_BRANCH,
        path: `docs/${page.path}`,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <Body components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return docsSource.generateParams();
}

export async function generateMetadata({ params }: DocsRouteProps): Promise<Metadata> {
  const page = docsSource.getPage((await params).slug);
  if (!page) notFound();
  const { title, description } = page.data;
  const image = { url: ogImageUrl(page), width: 1200, height: 630, alt: title };

  return {
    // The docs home is "Helpwren docs"; every other page keeps the site's "· Helpwren".
    title: page.slugs.length === 0 ? { absolute: `${SITE_NAME} docs` } : title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "article",
      url: page.url,
      siteName: SITE_NAME,
      title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
