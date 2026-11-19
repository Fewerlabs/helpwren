import { describe, expect, it } from "vitest";

import { htmlToText, replyText } from "./strip-reply";

// Replies as the common mail apps write them, to an email from Acme's reply address.
const fixtures: { name: string; text: string | null; html: string | null; reply: string }[] = [
  {
    name: "Gmail, plain text, with its attribution line wrapped",
    text: [
      "Yes please, send a new one.",
      "",
      "On Wed, Nov 19, 2026 at 10:00 AM Acme Support <",
      "reply+abc@support.acme.example> wrote:",
      "",
      "> You have a new reply from Acme",
      ">",
      "> It ships tomorrow.",
      "",
    ].join("\n"),
    html: null,
    reply: "Yes please, send a new one.",
  },
  {
    name: "Gmail, HTML only",
    text: null,
    html: [
      '<div dir="ltr"><div>Yes please,</div><div><br></div><div>send a new one &amp; thanks.</div></div><br>',
      '<div class="gmail_quote"><div dir="ltr" class="gmail_attr">On Wed, Nov 19, 2026 at 10:00 AM Acme Support &lt;<a href="mailto:reply+abc@support.acme.example">reply+abc@support.acme.example</a>&gt; wrote:<br></div>',
      '<blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex"><div>It ships tomorrow.</div></blockquote></div>',
    ].join(""),
    reply: "Yes please,\n\nsend a new one & thanks.",
  },
  {
    name: "Outlook, plain text, quoting with a header and no >",
    text: [
      "It arrived damaged, the box was open.",
      "",
      "Priya",
      "",
      "________________________________",
      "From: Acme Support <reply+abc@support.acme.example>",
      "Sent: Wednesday, November 19, 2026 10:00 AM",
      "To: Priya Shah <priya@example.org>",
      "Subject: New reply from Acme",
      "",
      "It ships tomorrow.",
    ].join("\r\n"),
    html: null,
    reply: "It arrived damaged, the box was open.\n\nPriya",
  },
  {
    name: "Outlook, HTML only, the header in bold with no rule",
    text: null,
    html: [
      "<html><head><style>p{margin:0}</style></head><body>",
      '<div style="font-family:Calibri">It arrived damaged.</div>',
      '<div id="divRplyFwdMsg"><b>From:</b> Acme Support &lt;reply+abc@support.acme.example&gt;<br>',
      "<b>Sent:</b> Wednesday, November 19, 2026 10:00 AM<br><b>Subject:</b> New reply</div>",
      "<div>It ships tomorrow.</div></body></html>",
    ].join(""),
    reply: "It arrived damaged.",
  },
  {
    name: "Apple Mail, plain text, sent from an iPhone",
    text: [
      "Perfect, thank you!",
      "",
      "Sent from my iPhone",
      "",
      "> On 19 Nov 2026, at 10:00, Acme Support <reply+abc@support.acme.example> wrote:",
      ">",
      "> It ships tomorrow.",
    ].join("\n"),
    html: null,
    reply: "Perfect, thank you!",
  },
  {
    name: "Apple Mail, HTML only, quoting with blockquote type=cite",
    text: null,
    html: [
      '<html><body><div dir="auto">Perfect,<br>thank you!</div>',
      '<div dir="ltr"><br><blockquote type="cite">On 19 Nov 2026, at 10:00, Acme Support &lt;reply+abc@support.acme.example&gt; wrote:<br><br></blockquote></div>',
      '<blockquote type="cite"><div dir="ltr">It ships tomorrow.</div></blockquote></body></html>',
    ].join(""),
    reply: "Perfect,\nthank you!",
  },
  {
    name: "a signature after the standard -- line",
    text: "Thanks, all sorted.\n\n-- \nPriya Shah\nHead of Ops, Example Ltd\n+44 20 7946 0000",
    html: null,
    reply: "Thanks, all sorted.",
  },
  {
    name: "a reply with no quote at all, kept whole",
    text: "Hello,\n\nMy order #1042 has not arrived.\nCan you check?",
    html: "<p>ignored, because there is a text part</p>",
    reply: "Hello,\n\nMy order #1042 has not arrived.\nCan you check?",
  },
];

describe("replyText", () => {
  it.each(fixtures)("keeps only the new words: $name", ({ text, html, reply }) => {
    expect(replyText({ text, html })).toBe(reply);
  });

  it("is empty for an email with nothing but a quote", () => {
    expect(replyText({ text: "> It ships tomorrow.", html: null })).toBe("");
    expect(replyText({ text: null, html: null })).toBe("");
  });
});

describe("htmlToText", () => {
  it("never keeps scripts, styles or tags, and decodes entities once", () => {
    expect(
      htmlToText(
        '<script>alert(1)</script><style>a{}</style><p onclick="x()">5 &lt; 6 &amp;&amp; &#x1F600; &amp;lt;b&amp;gt;</p><img src=x onerror=alert(1)>',
      ),
    ).toBe("5 < 6 && 😀 &lt;b&gt;");
  });

  it("quotes what is inside a blockquote, nested ones deeper", () => {
    expect(
      htmlToText("<p>Mine</p><blockquote><p>Theirs</p><blockquote>Older</blockquote></blockquote>"),
    ).toBe("Mine\n\n> Theirs\n>\n> > Older");
  });
});
