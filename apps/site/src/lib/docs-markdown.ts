import { existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import type { Blockquote, Link, Nodes, Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";

import { REPO_BRANCH, REPO_URL, docsUrl, isPublicDoc } from "./docs-files";

/**
 * The repository's root: the nearest folder above the working directory with the workspace file.
 * Found from the working directory, not this file, because the docs compiler bundles this file
 * into another folder.
 */
function repoRoot(from: string): string {
  if (existsSync(join(from, "pnpm-workspace.yaml"))) return from;
  const parent = dirname(from);
  if (parent === from) throw new Error("The repository's root was not found.");
  return repoRoot(parent);
}

/** The repository's root, and its `docs/` folder, as absolute paths. */
export const REPO_ROOT = repoRoot(process.cwd());
export const DOCS_ROOT = resolve(REPO_ROOT, "docs");

/** A search engine shows about this many characters of a description. */
const DESCRIPTION_LENGTH = 200;

function withoutFrontmatter(source: string): string {
  return source.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/** Markdown inline marks taken out, so a heading or sentence reads as plain text. */
function plain(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A page's title: the text of its first `# ` heading, as GitHub shows it. */
export function titleOf(source: string): string {
  const heading = /^# (.+)$/m.exec(withoutFrontmatter(source));
  return heading ? plain(heading[1] ?? "") : "";
}

/**
 * A page's description: its first paragraph after the title, cut at a sentence end within the
 * length a search engine shows.
 */
export function descriptionOf(source: string): string {
  const body = withoutFrontmatter(source).replace(/^# .+$/m, "");
  const paragraph = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block !== "" && !/^[#|`>\-[<!]/.test(block));
  const text = plain(paragraph ?? "");
  if (text.length <= DESCRIPTION_LENGTH) return text;
  const cut = text.slice(0, DESCRIPTION_LENGTH);
  const end = cut.lastIndexOf(". ");
  return end > 0 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const toPosix = (path: string) => path.split(sep).join("/");

/**
 * Where a link written for GitHub goes on the site. Links between published pages become site
 * addresses; links to anything else in the repository (code, decision records) go to GitHub.
 * Addresses with a scheme, site paths and in-page anchors are left as they are.
 */
export function siteHref(url: string, fromFile: string): string {
  if (/^([a-z][a-z\d+.-]*:|#|\/)/i.test(url)) return url;
  const [path = "", hash = ""] = url.split(/(?=#)/);
  const target = resolve(dirname(fromFile), decodeURI(path));
  const inRepo = toPosix(relative(REPO_ROOT, target));
  const inDocs = toPosix(relative(DOCS_ROOT, target));
  if (!inDocs.startsWith("..") && isPublicDoc(inDocs)) return `${docsUrl(inDocs)}${hash}`;
  const kind = existsSync(target) && statSync(target).isDirectory() ? "tree" : "blob";
  return `${REPO_URL}/${kind}/${REPO_BRANCH}/${inRepo}${hash}`;
}

/** GitHub's alert kinds, as Fumadocs' callout types and titles. */
const ALERTS: Record<string, { type: "info" | "idea" | "warning" | "error"; title: string }> = {
  NOTE: { type: "info", title: "Note" },
  TIP: { type: "idea", title: "Tip" },
  IMPORTANT: { type: "info", title: "Important" },
  WARNING: { type: "warning", title: "Warning" },
  CAUTION: { type: "error", title: "Caution" },
};

/**
 * GitHub's alerts (`> [!NOTE]` on the first line of a quote) as Fumadocs callouts, so a note
 * reads as a note on GitHub and on the site from the same Markdown.
 */
function toCallout(quote: Blockquote): MdxJsxFlowElement | undefined {
  const [first, ...rest] = quote.children;
  if (first?.type !== "paragraph") return undefined;
  const marker = first.children[0];
  if (marker?.type !== "text") return undefined;
  const match = /^\[!(\w+)\]\s*/.exec(marker.value);
  const alert = match ? ALERTS[match[1] ?? ""] : undefined;
  if (!match || !alert) return undefined;
  marker.value = marker.value.slice(match[0].length);
  const body = marker.value === "" ? first.children.slice(1) : first.children;
  const children = body.length > 0 ? [{ ...first, children: body }, ...rest] : rest;
  return {
    type: "mdxJsxFlowElement",
    name: "Callout",
    attributes: [
      { type: "mdxJsxAttribute", name: "type", value: alert.type },
      { type: "mdxJsxAttribute", name: "title", value: alert.title },
    ],
    children,
  };
}

function convertAlerts(node: Nodes): void {
  if (!("children" in node)) return;
  node.children.forEach((child, index) => {
    const callout = child.type === "blockquote" ? toCallout(child) : undefined;
    if (callout) node.children.splice(index, 1, callout);
    else convertAlerts(child);
  });
}

function rewriteLinks(node: Nodes, fromFile: string): void {
  if (node.type === "link" || node.type === "definition") {
    const link = node as Link;
    link.url = siteHref(link.url, fromFile);
  }
  if ("children" in node) for (const child of node.children) rewriteLinks(child, fromFile);
}

/**
 * The remark plugin for pages read from `docs/`. The page's `# ` heading is shown by the layout
 * from the title, so it is taken out of the body; GitHub's alerts become callouts; and every
 * relative link is pointed at the site or at GitHub.
 */
export function remarkDocsPage() {
  return (tree: Root, file: { path: string }) => {
    const first = tree.children[0];
    if (first?.type === "heading" && first.depth === 1) tree.children.shift();
    convertAlerts(tree);
    rewriteLinks(tree, file.path);
  };
}
