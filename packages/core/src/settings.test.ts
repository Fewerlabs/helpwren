import { describe, expect, it } from "vitest";

import { HelpwrenError } from "./errors";
import { parsePublicSettings, parseSettings, settingsPatchSchema } from "./settings";

const widget = { position: "right", offsetX: 20, offsetY: 20, launcher: "chat", quickReplies: [] };

const helpCenter = { headerStyle: "brand", headerLinks: [], footerLinks: [], showChat: true };

const chatPage = { headerStyle: "brand" };

const defaults = {
  brand: { name: "Helpwren" },
  widget,
  chatPage,
  email: { replies: true, status: true, inbound: { enabled: false, provider: "resend" } },
  helpCenter,
  tickets: { fromChat: true },
  guestDetails: "email",
  allowedDomains: [],
  sources: ["web"],
  visitors: { tracking: true, liveList: true },
  spam: { captcha: "off" },
};

describe("parseSettings", () => {
  it("builds one object from the rows", () => {
    expect(
      parseSettings([
        { key: "brand", value: { name: "Acme" } },
        { key: "guest_details", value: "phone" },
        { key: "sources", value: ["web", "ios"] },
        { key: "visitors", value: { liveList: false } },
      ]),
    ).toEqual({
      brand: { name: "Acme" },
      widget,
      chatPage,
      email: { replies: true, status: true, inbound: { enabled: false, provider: "resend" } },
      helpCenter,
      tickets: { fromChat: true },
      guestDetails: "phone",
      allowedDomains: [],
      sources: ["web", "ios"],
      visitors: { tracking: true, liveList: false },
      spam: { captcha: "off" },
    });
  });

  it("keeps a brand's own logo and colours, and refuses a colour that is not hex", () => {
    const brand = {
      name: "Acme",
      logo: "https://cdn.example.com/logo.png",
      accent: "#1d4ed8",
      accentTo: "#38bdf8",
    };
    expect(parseSettings([{ key: "brand", value: brand }]).brand).toEqual(brand);
    expect(() =>
      parseSettings([{ key: "brand", value: { name: "Acme", accent: "blue" } }]),
    ).toThrow(HelpwrenError);
  });

  it("fills in the parts of the widget's settings that were not stored", () => {
    const stored = { position: "left", welcome: "Hello!", quickReplies: ["Pricing"] };
    expect(parseSettings([{ key: "widget", value: stored }]).widget).toEqual({
      ...widget,
      ...stored,
    });
  });

  it("takes each launcher icon, and refuses one it does not know", () => {
    for (const launcher of ["chat", "logo", "wren"]) {
      expect(parseSettings([{ key: "widget", value: { launcher } }]).widget.launcher).toBe(
        launcher,
      );
    }
    expect(() => parseSettings([{ key: "widget", value: { launcher: "robin" } }])).toThrow(
      HelpwrenError,
    );
  });

  it("falls back to defaults when rows are missing", () => {
    expect(parseSettings([])).toEqual(defaults);
  });

  it("ignores keys this version does not know", () => {
    expect(parseSettings([{ key: "from_the_future", value: 1 }])).toEqual(defaults);
  });

  it("throws when a row has the wrong shape", () => {
    expect(() => parseSettings([{ key: "brand", value: { name: "" } }])).toThrow(HelpwrenError);
    expect(() => parseSettings([{ key: "guest_details", value: "fax" }])).toThrow(HelpwrenError);
  });
});

describe("parsePublicSettings", () => {
  it("leaves out settings that are not for everyone", () => {
    expect(parsePublicSettings([{ key: "sources", value: ["web", "ios"] }])).toEqual({
      brand: { name: "Helpwren" },
      widget,
      chatPage,
      helpCenter,
      tickets: { fromChat: true },
      guestDetails: "email",
      // The chat reads it to decide whether to check in.
      visitors: { tracking: true, liveList: true },
      // The chat shows the captcha with the site key, when there is one.
      spam: { captcha: "off" },
    });
  });
});

describe("the spam settings", () => {
  it("needs Turnstile's site key to switch the captcha on", () => {
    expect(settingsPatchSchema.safeParse({ spam: { captcha: "turnstile" } }).success).toBe(false);
    expect(
      settingsPatchSchema.safeParse({ spam: { captcha: "turnstile", siteKey: "0x4AAAA" } }).success,
    ).toBe(true);
    expect(settingsPatchSchema.safeParse({ spam: { captcha: "off" } }).success).toBe(true);
  });
});

describe("the help center's settings", () => {
  it("keeps what an admin set and fills in the rest", () => {
    const { helpCenter: parsed } = parseSettings([
      {
        key: "help_center",
        value: {
          title: "Acme help",
          headerStyle: "image",
          headerImage: "https://cdn.example.com/header.png",
          headerLinks: [{ label: "Back to Acme", url: "https://acme.example" }],
          showChat: false,
        },
      },
    ]);
    expect(parsed).toEqual({
      title: "Acme help",
      headerStyle: "image",
      headerImage: "https://cdn.example.com/header.png",
      headerLinks: [{ label: "Back to Acme", url: "https://acme.example" }],
      footerLinks: [],
      showChat: false,
    });
  });

  it("refuses a link that is not a web address or a path on the site", () => {
    for (const url of ["javascript:alert(1)", "//evil.example", "acme.example"]) {
      expect(() =>
        parseSettings([{ key: "help_center", value: { footerLinks: [{ label: "Terms", url }] } }]),
      ).toThrow(HelpwrenError);
    }
  });
});
