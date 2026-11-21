import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { APP_COLOURS, buildManifest } from "./manifest";

// Tests run from apps/web.
const tokens = readFileSync(
  resolve(process.cwd(), "../../packages/design-system/src/tokens/tokens.css"),
  "utf8",
);

/** `--canvas` in one block of the token stylesheet. */
function canvasIn(selector: string): string | undefined {
  const start = tokens.indexOf(`${selector} {`);
  const block = tokens.slice(start, tokens.indexOf("}", start));
  return /--canvas:\s*(#[0-9a-f]{6})/i.exec(block)?.[1];
}

describe("buildManifest", () => {
  it("names the app after the brand and opens the inbox", () => {
    const manifest = buildManifest("Acme");
    expect(manifest.name).toBe("Acme Support");
    expect(manifest.short_name).toBe("Acme");
    expect(manifest.start_url).toBe("/dashboard/inbox");
    expect(manifest.display).toBe("standalone");
  });

  it("has the icons an install needs", () => {
    const icons = buildManifest("Acme").icons ?? [];
    expect(icons.map((icon) => `${icon.sizes ?? ""} ${icon.purpose ?? ""}`)).toEqual([
      "192x192 any",
      "512x512 any",
      "512x512 maskable",
    ]);
  });

  it("uses the dashboard's canvas colours from the design tokens", () => {
    expect(APP_COLOURS.light).toBe(canvasIn(":root"));
    expect(APP_COLOURS.dark).toBe(canvasIn(".dark"));
  });
});
