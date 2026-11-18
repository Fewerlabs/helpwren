import { describe, expect, it } from "vitest";

import { renderEmail } from "./template";

const content = {
  preview: "Ada replied",
  heading: "Ada replied to you",
  body: ["Here is what was said."],
  quotes: [{ from: "Ada", text: "Use <b>code</b> SAVE10\nat checkout & enjoy." }],
  action: { label: "Continue the conversation", url: "https://shop.example/help?a=1&b=2" },
  footer: "You are getting this because you wrote to Acme.",
};

describe("renderEmail", () => {
  it("writes the same email as HTML and as plain text", () => {
    const { html, text } = renderEmail({ name: "Acme" }, content);

    expect(html).toContain("Ada replied to you");
    expect(html).toContain("Continue the conversation");
    expect(text).toBe(
      [
        "Ada replied to you",
        "",
        "Here is what was said.",
        "",
        "Ada:",
        "Use <b>code</b> SAVE10\nat checkout & enjoy.",
        "",
        "Continue the conversation: https://shop.example/help?a=1&b=2",
        "",
        "--",
        "You are getting this because you wrote to Acme.",
      ].join("\n"),
    );
  });

  it("never lets what someone wrote become markup", () => {
    const { html } = renderEmail(
      { name: 'Acme "<script>"' },
      { ...content, heading: "<img src=x onerror=alert(1)>" },
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>code</b>");
    expect(html).toContain("Use &lt;b&gt;code&lt;/b&gt; SAVE10<br>at checkout &amp; enjoy.");
    expect(html).toContain('href="https://shop.example/help?a=1&amp;b=2"');
  });

  it("wears the brand: its logo and its button colour, with readable text on it", () => {
    const { html } = renderEmail(
      { name: "Acme", logo: "https://cdn.example/logo.png", accent: "#1d4ed8", button: "#facc15" },
      content,
    );
    expect(html).toContain('<img src="https://cdn.example/logo.png" alt="Acme"');
    expect(html).toContain("background:#facc15;color:#1c1a16");
  });
});
