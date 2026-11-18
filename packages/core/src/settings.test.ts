import { describe, expect, it } from "vitest";

import { HelpwrenError } from "./errors";
import { parsePublicSettings, parseSettings } from "./settings";

const widget = { position: "right", offsetX: 20, offsetY: 20, launcher: "chat", quickReplies: [] };

const defaults = {
  brand: { name: "Helpwren" },
  widget,
  chatPage: {},
  email: { replies: true, status: true },
  helpCenter: {},
  tickets: { fromChat: true },
  guestDetails: "email",
  allowedDomains: [],
  sources: ["web"],
};

describe("parseSettings", () => {
  it("builds one object from the rows", () => {
    expect(
      parseSettings([
        { key: "brand", value: { name: "Acme" } },
        { key: "guest_details", value: "phone" },
        { key: "sources", value: ["web", "ios"] },
      ]),
    ).toEqual({
      brand: { name: "Acme" },
      widget,
      chatPage: {},
      email: { replies: true, status: true },
      helpCenter: {},
      tickets: { fromChat: true },
      guestDetails: "phone",
      allowedDomains: [],
      sources: ["web", "ios"],
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
      chatPage: {},
      helpCenter: {},
      tickets: { fromChat: true },
      guestDetails: "email",
    });
  });
});
