import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

import { SITE_NAME } from "@/content/site";
import { REPO_BRANCH } from "@/lib/docs-files";
import { docsSource, ogImageUrl } from "@/lib/docs-source";

export const dynamic = "force-static";
export const dynamicParams = false;

/** An image in a page, as it is: the docs' images are small badges hosted elsewhere. */
function DocsImage({ alt = "", ...props }: ComponentProps<"img">) {
  // next/image needs a size and an allowed host for every image, which a badge does not have.
  // eslint-disable-next-line @next/next/no-img-element -- see the comment above
  return <img alt={alt} {...props} />;
}

const components = { ...defaultMdxComponents, img: DocsImage };

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
      tableOfContent={{
        style: "clerk",
        container: { role: "complementary", "aria-label": "On this page" },
      }}
      editOnGithub={{
        owner: "Fewerlabs",
        repo: "helpwren",
        sha: REPO_BRANCH,
        path: `docs/${page.path}`,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <Body components={components} />
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
    // "Signed token · Helpwren docs", and "Helpwren docs" for the docs home.
    title: {
      absolute: page.slugs.length === 0 ? `${SITE_NAME} docs` : `${title} · ${SITE_NAME} docs`,
    },
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
