import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";

import { docsSource } from "@/lib/docs-source";

export const dynamic = "force-static";
export const dynamicParams = false;

const SIZE = { width: 1200, height: 630 };
const INK = "#1a1a1a";
const PENCIL = "#666666";
const MOSS = "#3d6b57";
const RULE = "#e8e8e8";

/** The last segment of every image's address, so it reads as a file. */
const FILE = "image.png";

/** The sidebar name of the section a page is in, such as "Know your users", or none at the top. */
function sectionOf(slugs: string[]): string {
  if (slugs.length < 2) return "";
  const url = `/docs/${slugs[0] ?? ""}`;
  const folder = docsSource
    .getPageTree()
    .children.find((node) => node.type === "folder" && node.index?.url === url);
  return folder && typeof folder.name === "string" ? folder.name : "";
}

/** A docs page's sharing image: the section, the page's title and its description. */
export async function GET(_request: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;
  const page = docsSource.getPage(slug.slice(0, -1));
  if (!page || slug.at(-1) !== FILE) notFound();
  const section = sectionOf(page.slugs);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: 80,
        borderTop: `16px solid ${MOSS}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 26, color: PENCIL, letterSpacing: 3 }}>
        {`HELPWREN DOCS${section ? ` · ${section.toUpperCase()}` : ""}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{ display: "flex", fontSize: 72, fontWeight: 600, color: INK, lineHeight: 1.1 }}
        >
          {page.data.title}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: PENCIL, lineHeight: 1.4 }}>
          {page.data.description}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          borderTop: `2px solid ${RULE}`,
          paddingTop: 24,
          fontSize: 24,
          color: PENCIL,
        }}
      >
        helpwren.fewerlabs.dev/docs
      </div>
    </div>,
    SIZE,
  );
}

export function generateStaticParams() {
  return docsSource.getPages().map((page) => ({ slug: [...page.slugs, FILE] }));
}
