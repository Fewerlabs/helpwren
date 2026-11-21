import { describe, expect, it } from "vitest";

import { chooseEmailAdapter, envChoosesEmail } from "./choose";

const saved = { host: "smtp.saved.example", port: 587, user: "a@b.example", password: "x" };

describe("choosing how the install sends mail", () => {
  it("takes the server's name and sign-in as plain values, with nothing to encode", () => {
    const choice = chooseEmailAdapter({
      smtpHost: "smtp.example.com",
      smtpPort: 465,
      smtpUser: "support@glown.example",
      smtpPassword: "abc#ix/(1)?",
    });
    expect(choice).toMatchObject({ problem: null, source: "server" });
    expect(choice.adapter?.name).toBe("SMTP");
  });

  it("reads an SMTP address whose username is an email address", () => {
    const choice = chooseEmailAdapter({
      provider: "smtp",
      smtpUrl: "smtps://support@glown.example:secret@smtp.example.com:465",
    });
    expect(choice.adapter?.name).toBe("SMTP");
    expect(choice.problem).toBeNull();
  });

  it("says what is wrong with an address it cannot read, without repeating it", () => {
    const smtpUrl = "smtps://support@glown.example:pa#ss/word?@smtp.example.com:465";
    const { adapter, problem } = chooseEmailAdapter({ smtpUrl });
    expect(adapter).toBeNull();
    expect(problem).toMatch(/SMTP_URL could not be read/);
    expect(problem).not.toContain("pa#ss");
    expect(problem).not.toContain("smtp.example.com");
  });

  it("says so when the server chooses a provider but leaves out what it needs", () => {
    expect(chooseEmailAdapter({ provider: "smtp" }).problem).toMatch(/SMTP_HOST is not set/);
    expect(chooseEmailAdapter({ provider: "resend" }).problem).toMatch(/RESEND_API_KEY/);
  });

  it("uses the server saved in Settings when the environment sets nothing", () => {
    const choice = chooseEmailAdapter({}, saved);
    expect(choice).toMatchObject({ problem: null, source: "settings" });
    expect(choice.adapter?.name).toBe("SMTP");
  });

  it("lets the environment win over a server saved in Settings", () => {
    const env = { smtpHost: "smtp.env.example" };
    expect(envChoosesEmail(env)).toBe(true);
    expect(chooseEmailAdapter(env, saved).source).toBe("server");
  });

  it("is not set up when neither the environment nor Settings sets anything", () => {
    expect(envChoosesEmail({})).toBe(false);
    expect(chooseEmailAdapter({})).toEqual({ adapter: null, problem: null, source: null });
  });
});
