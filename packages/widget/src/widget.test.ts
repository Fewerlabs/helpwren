import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createWidget, type HelpwrenWidget } from "./widget";

const APP = "https://support.example.com";

let widget: HelpwrenWidget;

function parts() {
  const root = document.querySelector("[data-helpwren]")?.shadowRoot;
  if (!root) throw new Error("The widget is not on the page.");
  const frame = root.querySelector("iframe");
  const panel = root.querySelector<HTMLElement>(".panel");
  if (!frame || !panel) throw new Error("The widget is incomplete.");
  return {
    frame,
    panel,
    launcher: root.querySelector<HTMLButtonElement>(".launcher"),
    badge: root.querySelector<HTMLElement>(".badge"),
  };
}

/** Delivers a message as if it came from the given window and origin. */
function receive(
  data: unknown,
  from: { origin?: string; source?: MessageEventSource | null } = {},
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: from.origin ?? APP,
      source: from.source === undefined ? parts().frame.contentWindow : from.source,
    }),
  );
}

beforeEach(() => {
  widget = createWidget(APP);
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("init", () => {
  it("adds nothing to the page until it is called", () => {
    expect(document.querySelector("[data-helpwren]")).toBeNull();
  });

  it("adds a closed panel with the chat frame, and a launcher", () => {
    widget.init({ source: "web_app" });
    const { frame, panel, launcher } = parts();

    expect(frame.src).toBe(`${APP}/embed?source=web_app`);
    expect(frame.title).toBe("Chat");
    expect(panel.dataset.open).toBe("false");
    expect(launcher).toHaveProperty("ariaExpanded", "false");
    expect(launcher?.getAttribute("aria-label")).toBe("Open chat");
  });

  it("defaults the source to web", () => {
    widget.init();
    expect(parts().frame.src).toBe(`${APP}/embed?source=web`);
  });

  it("can leave the launcher out, for sites with their own button", () => {
    widget.init({ launcher: false });
    expect(parts().launcher).toBeNull();
  });

  it("does nothing the second time", () => {
    widget.init();
    widget.init();
    expect(document.querySelectorAll("[data-helpwren]")).toHaveLength(1);
  });

  it("tells the frame which page it is on once the chat is ready, addressed to the app only", () => {
    widget.init();
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");

    receive({ channel: "helpwren", type: "ready" });

    expect(post).toHaveBeenCalledWith(
      { channel: "helpwren", type: "hello", page: { url: window.location.href, title: "" } },
      APP,
    );
  });
});

describe("opening and closing", () => {
  it("toggles with the launcher", () => {
    widget.init();
    const { launcher, panel } = parts();

    launcher?.click();
    expect(panel.dataset.open).toBe("true");
    expect(launcher?.getAttribute("aria-label")).toBe("Close chat");

    launcher?.click();
    expect(panel.dataset.open).toBe("false");
  });

  it("opens and closes from code", () => {
    widget.init({ launcher: false });
    widget.show();
    expect(parts().panel.dataset.open).toBe("true");
    widget.hide();
    expect(parts().panel.dataset.open).toBe("false");
  });

  it("closes when the chat asks to", () => {
    widget.init();
    widget.show();
    receive({ channel: "helpwren", type: "close" });
    expect(parts().panel.dataset.open).toBe("false");
  });
});

describe("unread messages", () => {
  it("shows the count on the launcher and tells listeners", () => {
    widget.init();
    const listener = vi.fn();
    widget.on("unread", listener);

    receive({ channel: "helpwren", type: "unread", count: 3 });
    expect(parts().badge?.hidden).toBe(false);
    expect(parts().badge?.textContent).toBe("3");
    expect(listener).toHaveBeenCalledWith(3);

    receive({ channel: "helpwren", type: "unread", count: 0 });
    expect(parts().badge?.hidden).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(0);
  });

  it("does not repeat a count that has not changed", () => {
    widget.init();
    const listener = vi.fn();
    widget.on("unread", listener);

    receive({ channel: "helpwren", type: "unread", count: 2 });
    receive({ channel: "helpwren", type: "unread", count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops telling a listener that has unsubscribed", () => {
    widget.init();
    const listener = vi.fn();
    const stop = widget.on("unread", listener);
    stop();

    receive({ channel: "helpwren", type: "unread", count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("messages it must ignore", () => {
  it.each([
    ["another origin", { origin: "https://evil.example" }],
    ["another window on the app's origin", { source: window }],
    ["no window at all", { source: null }],
  ])("ignores a message from %s", (_, from) => {
    widget.init();
    const listener = vi.fn();
    widget.on("unread", listener);

    receive({ channel: "helpwren", type: "unread", count: 5 }, from);
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    ["another channel", { channel: "other", type: "unread", count: 1 }],
    ["an unknown type", { channel: "helpwren", type: "navigate", url: "https://evil.example" }],
    ["a count that is not a whole number", { channel: "helpwren", type: "unread", count: "9" }],
    ["a negative count", { channel: "helpwren", type: "unread", count: -1 }],
    ["something that is not an object", "unread"],
  ])("ignores %s", (_, data) => {
    widget.init();
    const listener = vi.fn();
    widget.on("unread", listener);
    widget.show();

    receive(data);
    expect(listener).not.toHaveBeenCalled();
    expect(parts().panel.dataset.open).toBe("true");
  });
});
