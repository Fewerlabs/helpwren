import { existsSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { Heading, Link, Nodes, Root } from "mdast";

import { REPO_BRANCH, REPO_URL, docsUrl, isPublicDoc } from "./docs-files";

/** The repository's root, and its `docs/` folder, as absolute paths. */
export const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
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

function rewriteLinks(node: Nodes, fromFile: string): void {
  if (node.type === "link" || node.type === "definition") {
    const link = node as Link;
    link.url = siteHref(link.url, fromFile);
  }
  if ("children" in node) for (const child of node.children) rewriteLinks(child, fromFile);
}

/**
 * The remark plugin for pages read from `docs/`. The page's `# ` heading is shown by the layout
 * from the title, so it is taken out of the body, and every relative link is pointed at the site
 * or at GitHub.
 */
export function remarkDocsPage() {
  return (tree: Root, file: { path: string }) => {
    const first = tree.children[0];
    if (first?.type === "heading" && (first as Heading).depth === 1) tree.children.shift();
    rewriteLinks(tree, file.path);
  };
}
