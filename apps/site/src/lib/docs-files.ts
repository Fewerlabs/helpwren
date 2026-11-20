/**
 * Which files under the repository's `docs/` folder are published at /docs. Everything else in
 * that folder (decision records, the architecture notes, the landing page plan, the abuse
 * review) stays on GitHub only. Each entry is a file, or a folder ending in `/**`; an entry
 * starting with `!` leaves a file out.
 */
export const PUBLIC_DOCS = [
  "index.md",
  "how-it-works.md",
  "concepts.md",
  // Contextual help, written with the feature, is listed in the Help center section.
  "contextual-help.md",
  "get-started/**",
  "chat/**",
  "users/**",
  "help-center/**",
  "inbox/**",
  "mobile/**",
  "email/**",
  "security/**",
  "operations/**",
  "packages/**",
  "contributing/**",
  "!security/abuse-review.md",
  "!contributing/releasing.md",
] as const;

/** The repository the docs live in, and the branch the site is built from. */
export const REPO_URL = "https://github.com/Fewerlabs/helpwren";
export const REPO_BRANCH = "main";

/** Where the docs are served on the site. */
export const DOCS_BASE = "/docs";

function matches(entry: string, path: string): boolean {
  return entry.endsWith("/**") ? path.startsWith(entry.slice(0, -2)) : entry === path;
}

/** Whether a path inside `docs/` (such as `chat/options.md`) is a page on the site. */
export function isPublicDoc(path: string): boolean {
  if (!path.endsWith(".md")) return false;
  const included = PUBLIC_DOCS.some((entry) => !entry.startsWith("!") && matches(entry, path));
  const excluded = PUBLIC_DOCS.some((entry) => entry.startsWith("!") && entry.slice(1) === path);
  return included && !excluded;
}

/** The site address of a page, from its path inside `docs/`: `chat/index.md` is `/docs/chat`. */
export function docsUrl(path: string): string {
  const slug = path.replace(/\.md$/, "").replace(/(^|\/)index$/, "");
  return slug ? `${DOCS_BASE}/${slug}` : DOCS_BASE;
}
