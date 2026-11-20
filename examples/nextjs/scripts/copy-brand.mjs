// Copies Glown's logo, favicons and cover pictures into public/brand, which git ignores. They
// are Glown's trademarks and this repository is public, so they are never committed: each
// person who has them points GLOWN_ASSETS_DIR at their copy. Without them the example shows a
// plain text "Glown" and runs the same. Runs before `next dev` and `next build`.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
// Where Glown's team keeps them, unless GLOWN_ASSETS_DIR says otherwise.
const source = resolve(
  process.env.GLOWN_ASSETS_DIR ?? join(homedir(), "Documents/code/glown/glown assets"),
);
const target = join(here, "../public/brand");

/** Each file the example uses, by where it is in Glown's assets folder. */
const FILES = [
  "SVG/glown-full-dark.svg",
  "SVG/glown-full-light.svg",
  "PNG/glown-icon.png",
  "PNG/glown_cover.png",
  "PNG/glown_business_cover.png",
  "favicon_io/favicon.ico",
  "favicon_io/favicon-16x16.png",
  "favicon_io/favicon-32x32.png",
  "favicon_io/apple-touch-icon.png",
];

rmSync(target, { recursive: true, force: true });
const missing = FILES.filter((file) => !existsSync(join(source, file)));
if (missing.length > 0) {
  console.log(`Glown's brand files are not at ${source}; using a plain text logo.`);
} else {
  mkdirSync(target, { recursive: true });
  for (const file of FILES) copyFileSync(join(source, file), join(target, file.split("/").at(-1)));
  console.log(`Copied Glown's brand files from ${source}.`);
}
