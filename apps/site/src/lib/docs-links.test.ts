import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";

import { docsUrl, isPublicDoc } from "./docs-files";
import { DOCS_ROOT, descriptionOf, siteHref, titleOf } from "./docs-markdown";

const toPosix = (path: string) => path.split(sep).join("/");

const pages = readdirSync(DOCS_ROOT, { recursive: true, encoding: "utf8" })
  .map(toPosix)
  .filter(isPublicDoc);

/** The anchors GitHub and the site give a page's headings. */
function anchorsOf(markdown: string): Set<string> {
  const slugger = new GithubSlugger();
  const headings = withoutCode(markdown).matchAll(/^#{2,6} (.+)$/gm);
  return new Set([...headings].map(([, text = ""]) => slugger.slug(text.replace(/`/g, ""))));
}

function withoutCode(markdown: string): string {
  return markdown.replace(/^```[\s\S]*?^```/gm, "").replace(/`[^`\n]*`/g, "");
}

/** Every link written in a page, outside code. */
function linksOf(markdown: string): string[] {
  return [...withoutCode(markdown).matchAll(/\]\(([^)\s]+)\)/g)].map(([, url = ""]) => url);
}

describe("the docs pages", () => {
  it("are found, from the introduction to the reference", () => {
    expect(pages).toEqual(
      expect.arrayContaining(["index.md", "get-started/index.md", "packages/helpwren.md"]),
    );
    expect(pages).not.toContain("security/abuse-review.md");
    expect(pages).not.toContain("architecture.md");
  });

  it.each(pages)("%s has a title and a one-sentence summary", (page) => {
    const markdown = readFileSync(join(DOCS_ROOT, page), "utf8");
    expect(titleOf(markdown)).not.toBe("");
    const summary = descriptionOf(markdown);
    expect(summary).toMatch(/[.?]$/);
    expect(summary).not.toMatch(/[.?] [A-Z]/);
  });

  it.each(pages)("%s links only to files and headings that exist", (page) => {
    const file = join(DOCS_ROOT, page);
    const broken = linksOf(readFileSync(file, "utf8")).filter((url) => {
      if (/^([a-z][a-z\d+.-]*:|\/)/i.test(url)) return false;
      const [path = "", hash] = url.split("#");
      const target = path === "" ? file : resolve(dirname(file), path);
      if (!existsSync(target)) return true;
      return Boolean(
        hash && target.endsWith(".md") && !anchorsOf(readFileSync(target, "utf8")).has(hash),
      );
    });
    expect(broken).toEqual([]);
  });
});

describe("links on the site", () => {
  const from = join(DOCS_ROOT, "chat/index.md");

  it("go to the page a link between published pages points at", () => {
    expect(siteHref("options.md", from)).toBe("/docs/chat/options");
    expect(siteHref("../users/index.md#identify-users-on-every-page", from)).toBe(
      "/docs/users#identify-users-on-every-page",
    );
  });

  it("go to GitHub for anything that is not a published page", () => {
    expect(siteHref("../decisions/0009-widget.md", from)).toBe(
      "https://github.com/Fewerlabs/helpwren/blob/main/docs/decisions/0009-widget.md",
    );
    expect(siteHref("../../examples/plain-html", from)).toBe(
      "https://github.com/Fewerlabs/helpwren/tree/main/examples/plain-html",
    );
  });

  it("leave other sites, site paths and anchors as they are", () => {
    for (const url of ["https://supabase.com", "/docs", "#options"]) {
      expect(siteHref(url, from)).toBe(url);
    }
  });

  it("use one address per page", () => {
    expect(docsUrl("index.md")).toBe("/docs");
    expect(docsUrl("chat/index.md")).toBe("/docs/chat");
    expect(toPosix(relative(DOCS_ROOT, from))).toBe("chat/index.md");
  });
});
