// Checks every link in the built docs: each address on this site must be a page the build wrote
// (or a file in public/), and each #anchor must be an id on that page. Runs after `next build`.
// Links to other sites are not fetched.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const built = join(root, ".next/server/app");
const publicDir = join(root, "public");

/** Every file under a folder, as paths relative to it with forward slashes. */
function filesIn(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"));
}

if (!existsSync(built)) {
  console.error("No build found. Run `next build` first.");
  process.exit(1);
}

const builtFiles = filesIn(built);
/** Site address of every prerendered page, from `docs/chat.html` to `/docs/chat`. */
const pages = new Map(
  builtFiles
    .filter((file) => file.endsWith(".html") && !file.startsWith("_"))
    .map((file) => {
      const path = `/${file.replace(/\.html$/, "")}`.replace(/^\/index$/, "/");
      return [path, readFileSync(join(built, file), "utf8")];
    }),
);
/** Other routes the build wrote, such as `/docs/search.json` and the sharing images. */
const routes = new Set(
  builtFiles.filter((file) => file.endsWith(".body")).map((file) => `/${file.slice(0, -5)}`),
);
const assets = new Set(existsSync(publicDir) ? filesIn(publicDir).map((file) => `/${file}`) : []);

const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const decode = (value) => value.replaceAll("&amp;", "&");

const problems = [];
let checked = 0;
for (const [from, html] of pages) {
  if (from !== "/docs" && !from.startsWith("/docs/")) continue;
  for (const [, raw] of html.matchAll(/<a\s[^>]*?href="([^"]+)"/g)) {
    const href = decode(raw);
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) continue;
    checked += 1;
    const [pathAndQuery, hash] = href.split("#");
    const path = (pathAndQuery ?? "").split("?")[0] || from;
    const target = pages.get(path.replace(/\/$/, "") || "/");
    if (!target && !routes.has(path) && !assets.has(path)) {
      problems.push(`${from}: ${href} is not a page`);
    } else if (hash && target && !idsOf(target).has(decodeURIComponent(hash))) {
      problems.push(`${from}: ${href} has no #${hash}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Broken links in the docs (${problems.length}):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`Docs links: ${checked} links checked, none broken.`);
