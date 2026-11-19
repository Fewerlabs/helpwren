import { readFile } from "node:fs/promises";
import path from "node:path";

import { icons, IconStyle, type IconEntry } from "@phosphor-icons/core";

const weights: ReadonlySet<string> = new Set(Object.values(IconStyle));

// Every icon's name, and the older names Phosphor has renamed, each to the file it is in now.
// A request is answered only for a name in here, so nothing typed into the address can reach
// any other file.
const files = new Map<string, string>();
// Read as plain entries: the package types each of its 1,500 icons separately.
const entries: readonly IconEntry[] = icons;
for (const icon of entries) {
  files.set(icon.name, icon.name);
  if (icon.alias) files.set(icon.alias.name, icon.name);
}

// The package's SVG files, read from disk rather than bundled: there are some 9,000 of them.
const assets = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "node_modules/@phosphor-icons/core/assets",
);

// A drawing never changes under its name, so browsers and the CDN may keep it for a year.
const FOREVER = "public, max-age=31536000, immutable";

/**
 * One Phosphor icon as an SVG file, such as `/api/icons/duotone/rocket-launch.svg`. Collections
 * may wear any of Phosphor's icons; pages draw the one they need from here instead of carrying
 * every icon's code.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/icons/[weight]/[name]">,
): Promise<Response> {
  const { weight, name } = await params;
  const icon = name.endsWith(".svg") ? files.get(name.slice(0, -".svg".length)) : undefined;
  if (!icon || !weights.has(weight)) {
    return new Response("No such icon.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // The regular weight's files carry no suffix; the others end in their weight.
  const file = weight === "regular" ? `${icon}.svg` : `${icon}-${weight}.svg`;
  const svg = await readFile(path.join(assets, weight, file));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": FOREVER,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
