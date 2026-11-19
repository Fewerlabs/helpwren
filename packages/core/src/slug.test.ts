import { describe, expect, it } from "vitest";

import { insertWithFreeSlug, slugify, slugSchema } from "./slug";

describe("slugify", () => {
  it("turns a title into lower case words joined by hyphens", () => {
    expect(slugify("  Add the chat to your website!  ")).toBe("add-the-chat-to-your-website");
  });

  it("drops accents and keeps the letters", () => {
    expect(slugify("Réserver une table à Zürich")).toBe("reserver-une-table-a-zurich");
  });

  it("never ends on a hyphen, even when cut short", () => {
    expect(slugify("one two three", 8)).toBe("one-two");
  });

  it("gives nothing for text with no Latin letters or digits", () => {
    expect(slugify("こんにちは")).toBe("");
  });

  it("always gives something the schema accepts, or nothing", () => {
    for (const title of ["What's new in 2.0?", "--draft--", "A & B"]) {
      expect(slugSchema.safeParse(slugify(title)).success).toBe(true);
    }
  });
});

describe("insertWithFreeSlug", () => {
  it("tries the next number while the slug is taken", async () => {
    const taken = new Set(["billing", "billing-2"]);
    const result = await insertWithFreeSlug("billing", (slug) =>
      Promise.resolve(
        taken.has(slug) ? { data: null, error: { code: "23505" } } : { data: slug, error: null },
      ),
    );
    expect(result).toEqual({ data: "billing-3", error: null });
  });

  it("stops at once on any other failure", async () => {
    let attempts = 0;
    const result = await insertWithFreeSlug("billing", () => {
      attempts += 1;
      return Promise.resolve({ data: null, error: { code: "42501" } });
    });
    expect(attempts).toBe(1);
    expect(result.error).toEqual({ code: "42501" });
  });
});
