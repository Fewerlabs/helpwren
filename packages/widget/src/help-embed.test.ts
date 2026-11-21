import { afterEach, describe, expect, it } from "vitest";

import { createHelpEmbed, helpEmbedUrl } from "./help-embed";
import { createWidget } from "./widget";

const APP = "https://support.example.com";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("helpEmbedUrl", () => {
  it("is the embedded help center with only the options given", () => {
    expect(helpEmbedUrl(APP)).toBe(`${APP}/help?embed=1`);
    expect(
      helpEmbedUrl(APP, {
        hide: ["breadcrumbs"],
        padding: "none",
        background: "transparent",
        theme: "dark",
      }),
    ).toBe(`${APP}/help?embed=1&hide=breadcrumbs&padding=none&bg=transparent&theme=dark`);
    expect(helpEmbedUrl(APP, { hide: ["title", "subtitle"], accent: "#1d4ed8" })).toBe(
      `${APP}/help?embed=1&hide=title,subtitle&accent=1d4ed8`,
    );
  });
});

describe("createHelpEmbed", () => {
  function send(frame: HTMLIFrameElement, data: unknown, origin = APP) {
    window.dispatchEvent(
      new MessageEvent("message", { data, origin, source: frame.contentWindow }),
    );
  }

  it("adds a frame to the container and sizes it from the help center's messages", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const remove = createHelpEmbed(APP, container, { collection: "billing" });
    const frame = container.querySelector("iframe");
    if (!frame) throw new Error("No frame was added.");
    expect(frame.src).toBe(`${APP}/help?embed=1&collection=billing`);
    expect(frame.title).toBe("Help");

    send(frame, { channel: "helpwren", type: "help-height", height: 412.4 });
    expect(frame.style.height).toBe("413px");
    // It shrinks as well as grows.
    send(frame, { channel: "helpwren", type: "help-height", height: 180 });
    expect(frame.style.height).toBe("180px");
    expect(frame.style.minHeight).toBe("0px");

    // Messages from anywhere else, or of another kind, change nothing.
    send(frame, { channel: "helpwren", type: "help-height", height: 900 }, "https://evil.example");
    send(frame, { channel: "helpwren", type: "help-height", height: "900" });
    send(frame, { channel: "other", type: "help-height", height: 900 });
    expect(frame.style.height).toBe("180px");

    remove();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("is on the widget as embedHelp, for the install the script came from", () => {
    const container = document.createElement("div");
    document.body.append(container);
    createWidget(APP).embedHelp(container, { hide: ["search"] });
    expect(container.querySelector("iframe")?.src).toBe(`${APP}/help?embed=1&hide=search`);
  });
});
