import { describe, expect, it } from "vitest";

import { chooseEmailAdapter } from "./choose";

describe("choosing how the install sends mail", () => {
  it("reads an SMTP address whose username is an email address", () => {
    const { adapter, problem } = chooseEmailAdapter({
      provider: "smtp",
      smtpUrl: "smtps://support@glown.example:secret@smtp.example.com:465",
    });
    expect(adapter?.name).toBe("SMTP");
    expect(problem).toBeNull();
  });

  it("says what is wrong with an address it cannot read, without repeating it", () => {
    const smtpUrl = "smtps://support@glown.example:pa#ss/word?@smtp.example.com:465";
    const { adapter, problem } = chooseEmailAdapter({ provider: "smtp", smtpUrl });
    expect(adapter).toBeNull();
    expect(problem).toMatch(/SMTP_URL could not be read/);
    expect(problem).not.toContain("pa#ss");
    expect(problem).not.toContain("smtp.example.com");
  });

  it("is not set up when the provider's secret is missing", () => {
    expect(chooseEmailAdapter({ provider: "smtp" })).toEqual({ adapter: null, problem: null });
    expect(chooseEmailAdapter({})).toEqual({ adapter: null, problem: null });
  });
});
