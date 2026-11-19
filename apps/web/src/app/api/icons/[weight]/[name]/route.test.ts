import { describe, expect, it } from "vitest";

import { GET } from "./route";

function get(weight: string, name: string) {
  return GET(new Request(`http://localhost/api/icons/${weight}/${name}`), {
    params: Promise.resolve({ weight, name }),
  });
}

describe("GET /api/icons/[weight]/[name]", () => {
  it("serves an icon's SVG, to be kept for a long time", async () => {
    const response = await get("regular", "rocket.svg");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(await response.text()).toMatch(/^<svg[^>]*viewBox="0 0 256 256"/);
  });

  it("serves the other weights from their own files", async () => {
    const response = await get("duotone", "rocket-launch.svg");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('opacity="0.2"');
  });

  it("serves an icon under the name Phosphor used to give it", async () => {
    const [old, current] = await Promise.all([
      get("regular", "folder-notch.svg"),
      get("regular", "folder.svg"),
    ]);
    expect(old.status).toBe(200);
    expect(await old.text()).toBe(await current.text());
  });

  it.each([
    ["regular", "not-an-icon.svg"],
    ["regular", "rocket"],
    ["regular", "rocket.png"],
    ["heavy", "rocket.svg"],
    ["regular", "../../package.json"],
    ["regular", "..%2F..%2Fpackage.json"],
    ["..", "regular%2Frocket.svg"],
    ["regular", "constructor.svg"],
    ["regular", "__proto__.svg"],
  ])("refuses %s/%s", async (weight, name) => {
    const response = await get(weight, name);
    expect(response.status).toBe(404);
  });
});
