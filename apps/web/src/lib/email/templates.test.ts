import { describe, expect, it } from "vitest";

import {
  REPLY_HINT,
  buildEmail,
  buildInviteEmail,
  fillPlaceholders,
  sampleEmail,
} from "./templates";

const brand = { name: "Glown", accent: "#f1635e" };

describe("fillPlaceholders", () => {
  it("puts values in, with or without spaces, and drops ones it does not know", () => {
    expect(
      fillPlaceholders("Hi {{name}}, from {{ brand }}{{nope}}.", { name: "Amara", brand: "Glown" }),
    ).toBe("Hi Amara, from Glown.");
  });

  it("leaves no double space where a placeholder was empty", () => {
    expect(fillPlaceholders("About your ticket {{ticket}} today", { ticket: "" })).toBe(
      "About your ticket today",
    );
  });
});

describe("buildEmail", () => {
  const variables = {
    brand: "Glown",
    name: "Amara",
    ticket: "#1042 Can't move my booking",
    replies: "2 new replies",
    status: "Resolved",
  };

  it("uses Helpwren's wording when the admin has written none", () => {
    const email = buildEmail({
      brand,
      kind: "ticketReply",
      variables,
      url: "https://example.com",
      answerable: false,
    });
    expect(email.subject).toBe("Re: #1042 Can't move my booking");
    expect(email.text).toContain("You have 2 new replies from Glown");
    expect(email.text).not.toContain(REPLY_HINT);
  });

  it("uses the admin's words where given, with paragraphs, and keeps the rest", () => {
    const email = buildEmail({
      brand,
      kind: "ticketStatus",
      template: { subject: "{{name}}, your ticket is {{status}}", body: "All done.\n\nThanks!" },
      variables,
      url: "https://example.com",
      answerable: true,
    });
    expect(email.subject).toBe("Amara, your ticket is Resolved");
    expect(email.text).toContain("Your ticket is now Resolved");
    expect(email.html).toContain("All done.");
    expect(email.html).toContain("Thanks!");
    expect(email.text).toContain(REPLY_HINT);
    expect(email.text).toContain("Open the conversation");
  });

  it("escapes what the admin writes", () => {
    const email = buildEmail({
      brand,
      kind: "chatReply",
      template: { heading: "<b>Hi</b>" },
      variables,
      url: "https://example.com",
      answerable: false,
    });
    expect(email.html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
  });

  it("makes a sample of each email for the preview", () => {
    const email = buildEmail(sampleEmail({ brand, kind: "chatReply", template: undefined }));
    expect(email.subject).toBe("New reply from Glown");
    expect(email.text).toContain("Sam Rivera");
  });
});

describe("buildInviteEmail", () => {
  const url = "https://support.example.com/invite/abc";

  it("says who invited them, to which team, with a button to set a password", () => {
    const email = buildInviteEmail({ brand, inviter: "Ada Okafor", url, days: 7 });
    expect(email.subject).toBe("Ada Okafor invited you to Glown's support team");
    expect(email.html).toContain(`href="${url}"`);
    expect(email.html).toContain("Set your password");
    expect(email.text).toContain(`Set your password: ${url}`);
    expect(email.text).toContain("The link works once, for 7 days.");
  });

  it("wears the brand, and escapes what the admin typed", () => {
    const email = buildInviteEmail({
      brand: { ...brand, name: "<Glown>" },
      inviter: "Ada <b>",
      url,
      days: 7,
    });
    expect(email.html).toContain("#f1635e");
    expect(email.html).toContain("&lt;Glown&gt;");
    expect(email.html).not.toContain("Ada <b>");
  });
});
