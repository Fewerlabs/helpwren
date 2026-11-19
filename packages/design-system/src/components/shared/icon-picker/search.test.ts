import { describe, expect, it } from "vitest";

import { catalogue } from "./catalogue";
import { matchIcons } from "./search";

const names = (query: string) => matchIcons(catalogue, query).map((entry) => entry.name);

describe("matchIcons", () => {
  it("offers every Phosphor icon while nothing is typed", () => {
    expect(catalogue.length).toBeGreaterThan(1_400);
    expect(names("  ")).toHaveLength(catalogue.length);
  });

  it("finds icons by what they show, through Phosphor's tags", () => {
    const money = names("money");
    expect(money).toEqual(expect.arrayContaining(["coins", "currency-dollar", "wallet"]));
    expect(money).not.toContain("rocket");
  });

  it("finds icons by category", () => {
    expect(names("weather")).toEqual(expect.arrayContaining(["cloud-rain", "sun"]));
  });

  it("puts icons whose name starts with the search first", () => {
    expect(names("rocket").slice(0, 2)).toEqual(["rocket", "rocket-launch"]);
  });

  it("needs every word, in the name or the tags, and ignores case", () => {
    expect(names("Rocket Launch")[0]).toBe("rocket-launch");
    expect(names("arrow left")).toContain("arrow-left");
    expect(names("arrow left")).not.toContain("arrow-right");
  });

  it("finds an icon by the name Phosphor used to give it", () => {
    expect(names("folder-notch")).toContain("folder");
  });

  it("finds nothing for words no icon has", () => {
    expect(names("zzzzqx")).toEqual([]);
  });
});
