import { describe, expect, it } from "vitest";

import { createPostmarkInbound, verifyBasicAuth } from "./postmark";

const SECRET = "pm_inbound_secret_value";

// Postmark's inbound JSON, trimmed to what matters, in the shape its documentation shows.
const payload = {
  FromName: "Priya Shah",
  MessageStream: "inbound",
  From: "Priya@Example.org",
  FromFull: { Email: "Priya@Example.org", Name: "Priya Shah", MailboxHash: "" },
  To: '"Acme" <reply+abc123@support.acme.example>',
  ToFull: [{ Email: "reply+abc123@support.acme.example", Name: "Acme", MailboxHash: "abc123" }],
  Cc: "",
  CcFull: [],
  Bcc: "",
  BccFull: [],
  OriginalRecipient: "reply+abc123@support.acme.example",
  Subject: "Re: Your ticket is now resolved",
  MessageID: "73e6d360-66eb-11e1-8e72-a8904824019b",
  ReplyTo: "",
  MailboxHash: "abc123",
  Date: "Wed, 19 Nov 2026 10:00:00 +0000",
  TextBody: "It is not sorted yet.\n\n> Your ticket is now resolved",
  HtmlBody: '<p>It is not sorted yet.</p><img src="cid:logo@01">',
  StrippedTextReply: "It is not sorted yet.",
  Tag: "",
  Headers: [
    { Name: "X-Spam-Status", Value: "No" },
    { Name: "Message-ID", Value: "<A1B2C3@icloud.com>" },
    { Name: "In-Reply-To", Value: "<helpwren.c1.s1@support.acme.example>" },
    { Name: "References", Value: "<helpwren.c1@support.acme.example>" },
  ],
  Attachments: [
    {
      Name: "screenshot.png",
      Content: Buffer.from("PNGDATA").toString("base64"),
      ContentType: "image/png",
      ContentLength: 7,
      ContentID: "",
    },
    {
      Name: "logo.png",
      Content: Buffer.from("LOGO").toString("base64"),
      ContentType: "image/png",
      ContentLength: 4,
      ContentID: "logo@01",
    },
  ],
};

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("verifyBasicAuth", () => {
  const body = JSON.stringify(payload);

  it("accepts the secret as the password in the webhook's address", () => {
    expect(
      verifyBasicAuth(
        { body, headers: new Headers({ authorization: basic("postmark", SECRET) }) },
        SECRET,
      ),
    ).toBe(true);
  });

  it("turns away a wrong password, no password and no header", () => {
    for (const authorization of [
      basic("postmark", "guess"),
      basic("postmark", ""),
      `Basic ${btoa(SECRET)}`,
    ]) {
      expect(verifyBasicAuth({ body, headers: new Headers({ authorization }) }, SECRET)).toBe(
        false,
      );
    }
    expect(verifyBasicAuth({ body, headers: new Headers() }, SECRET)).toBe(false);
  });
});

describe("the Postmark inbound adapter", () => {
  it("reads the email and its files, and the sender's own Message-ID", async () => {
    const email = await createPostmarkInbound({ secret: SECRET }).parse({
      body: JSON.stringify(payload),
      headers: new Headers(),
    });

    expect(email).toMatchObject({
      from: { address: "priya@example.org", name: "Priya Shah" },
      recipients: ["reply+abc123@support.acme.example", "reply+abc123@support.acme.example"],
      subject: "Re: Your ticket is now resolved",
      text: payload.TextBody,
      messageId: "A1B2C3@icloud.com",
      providerId: payload.MessageID,
      inReplyTo: "helpwren.c1.s1@support.acme.example",
      references: ["helpwren.c1@support.acme.example"],
    });
    expect(email.attachments.map(({ name, size, inline }) => ({ name, size, inline }))).toEqual([
      { name: "screenshot.png", size: 7, inline: false },
      { name: "logo.png", size: 4, inline: true },
    ]);
    expect(new TextDecoder().decode(await email.attachments[0]?.content())).toBe("PNGDATA");
  });

  it("refuses a body that is not Postmark's", async () => {
    await expect(
      createPostmarkInbound({ secret: SECRET }).parse({ body: "{}", headers: new Headers() }),
    ).rejects.toThrow("Not a Postmark inbound email.");
  });
});
