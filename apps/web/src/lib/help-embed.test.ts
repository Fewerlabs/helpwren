import { describe, expect, it } from "vitest";

import { embedQuery, parseHelpEmbed, withEmbed } from "./help-embed";

const parse = (query: string) => parseHelpEmbed(new URLSearchParams(query));

describe("parseHelpEmbed", () => {
  it("is off unless the address asks for exactly embed=1", () => {
    expect(parse("")).toBeNull();
    expect(parse("embed=true")).toBeNull();
    expect(parse("hide=search")).toBeNull();
    expect(parse("embed=1")).toEqual({ hide: [] });
  });

  it("keeps the parts it knows and drops the rest", () => {
    expect(parse("embed=1&hide=chat,search,nonsense,<script>")?.hide).toEqual(["search", "chat"]);
  });

  it("takes a colour only as six hex digits", () => {
    expect(parse("embed=1&accent=1D4ED8")?.accent).toBe("#1d4ed8");
    expect(parse("embed=1&accent=%231d4ed8")?.accent).toBe("#1d4ed8");
    for (const bad of ["red", "1d4", "1d4ed8;background:url(x)", "var(--x)", "1d4ed8ff"]) {
      expect(parse(`embed=1&accent=${encodeURIComponent(bad)}`)?.accent).toBeUndefined();
    }
  });

  it("takes a collection only as a slug, and trims a search", () => {
    expect(parse("embed=1&collection=getting-started")?.collection).toBe("getting-started");
    expect(parse("embed=1&collection=../dashboard")?.collection).toBeUndefined();
    expect(parse("embed=1&q=%20refund%20")?.query).toBe("refund");
    expect(parse(`embed=1&q=${"a".repeat(500)}`)?.query).toHaveLength(200);
  });
});

describe("links inside the frame", () => {
  const embed = { hide: ["search", "chat"] as const, accent: "#1d4ed8", collection: "billing" };

  it("carry the look and what is hidden, and not where to open", () => {
    expect(embedQuery(embed)).toBe("embed=1&hide=search%2Cchat&accent=1d4ed8");
  });

  it("are left alone outside a frame", () => {
    expect(withEmbed("/help/billing", null)).toBe("/help/billing");
  });

  it("keep their own query and their anchor", () => {
    expect(withEmbed("/help/billing", { hide: [] })).toBe("/help/billing?embed=1");
    expect(withEmbed("/help/search?q=tax", { hide: [] })).toBe("/help/search?q=tax&embed=1");
    expect(withEmbed("/help/a/b#steps", { hide: [] })).toBe("/help/a/b?embed=1#steps");
  });
});
