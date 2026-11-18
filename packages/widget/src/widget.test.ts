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

/** What the install answers when the widget asks how it should look. */
let answer: unknown;

beforeEach(() => {
  answer = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(answer)))),
  );
  widget = createWidget(APP);
});

afterEach(() => {
  widget.destroy();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function host() {
  const element = document.querySelector<HTMLElement>("[data-helpwren]");
  if (!element) throw new Error("The widget is not on the page.");
  return element;
}

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

describe("appearance", () => {
  it("asks the install how to look, and follows the answer", async () => {
    answer = {
      position: "left",
      offsetX: 32,
      offsetY: 48,
      accent: "#1d4ed8",
      accentTo: "#38bdf8",
      accentInk: "#ffffff",
      launcher: "logo",
      logo: "https://cdn.example.com/logo.png",
    };
    widget.init();
    expect(fetch).toHaveBeenCalledWith(new URL("/api/widget", APP));

    await vi.waitFor(() => {
      expect(host().dataset.position).toBe("left");
    });
    expect(host().style.getPropertyValue("--hw-x")).toBe("32px");
    expect(host().style.getPropertyValue("--hw-y")).toBe("48px");
    expect(host().style.getPropertyValue("--hw-accent-fill")).toBe(
      "linear-gradient(135deg, #1d4ed8, #38bdf8)",
    );
    expect(parts().launcher?.querySelector("img")?.src).toBe("https://cdn.example.com/logo.png");
  });

  it("keeps its defaults when the answer is missing or cannot be trusted", async () => {
    answer = {
      position: "top",
      offsetX: 9999,
      accent: "red; background: url(https://evil.example)",
      launcher: "logo",
      logo: "javascript:alert(1)",
    };
    widget.init();
    await vi.waitFor(() => {
      expect(host().style.getPropertyValue("--hw-x")).toBe("120px");
    });
    expect(host().dataset.position).toBe("right");
    expect(host().style.getPropertyValue("--hw-accent")).toBe("#3d6b57");
    expect(parts().launcher?.querySelector("img")).toBeNull();
  });
});

describe("preview", () => {
  it("sits inside an element, looks as it is told, and passes the chat its settings", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const settings = { brand: { name: "Acme" } };
    widget.init({
      container,
      open: true,
      preview: { appearance: { accent: "#be123c" }, settings },
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(container.contains(host())).toBe(true);
    expect(host().dataset.contained).toBe("");
    expect(host().style.getPropertyValue("--hw-accent")).toBe("#be123c");
    const { frame, panel } = parts();
    expect(panel.dataset.open).toBe("true");
    expect(new URL(frame.src).searchParams.get("preview")).toBe("1");
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");

    receive({ channel: "helpwren", type: "ready" });
    expect(post).toHaveBeenCalledWith({ channel: "helpwren", type: "preview", settings }, APP);

    widget.preview({ appearance: { position: "left" }, settings: { brand: { name: "Zed" } } });
    expect(host().dataset.position).toBe("left");
    expect(host().style.getPropertyValue("--hw-accent")).toBe("#be123c");
    expect(post).toHaveBeenLastCalledWith(
      { channel: "helpwren", type: "preview", settings: { brand: { name: "Zed" } } },
      APP,
    );
  });
});

describe("welcome message", () => {
  const teaser = () => {
    const root = host().shadowRoot;
    const box = root?.querySelector<HTMLElement>(".teaser");
    if (!root || !box) throw new Error("There is no welcome message.");
    return {
      box,
      chips: [...root.querySelectorAll<HTMLButtonElement>(".chip")],
      dismiss: root.querySelector<HTMLButtonElement>(".teaser-close"),
    };
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    answer = { name: "Acme", welcome: "Hello! <b>Ask</b> us anything.", quickReplies: ["Pricing"] };
  });

  it("shows beside the launcher, as text, until the chat is opened", async () => {
    widget.init();
    await vi.waitFor(() => {
      expect(teaser().box.hidden).toBe(false);
    });
    // What the install wrote is shown as it is, never read as markup.
    expect(teaser().box.textContent).toContain("Hello! <b>Ask</b> us anything.");
    expect(teaser().box.querySelector("b")).toBeNull();

    widget.show();
    expect(teaser().box.hidden).toBe(true);
    widget.hide();
    expect(teaser().box.hidden).toBe(true);
  });

  it("opens the chat on a new conversation with the reply that was tapped", async () => {
    widget.init();
    const { frame, panel } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    await vi.waitFor(() => {
      expect(teaser().chips).toHaveLength(1);
    });

    // Tapped before the chat has loaded: the message waits for the frame to be ready.
    teaser().chips[0]?.click();
    expect(panel.dataset.open).toBe("true");
    expect(post).not.toHaveBeenCalled();
    receive({ channel: "helpwren", type: "ready" });
    expect(post).toHaveBeenLastCalledWith(
      { channel: "helpwren", type: "start", reply: "Pricing" },
      APP,
    );
  });

  it("stays away for the rest of the visit once dismissed", async () => {
    widget.init();
    await vi.waitFor(() => {
      expect(teaser().box.hidden).toBe(false);
    });
    teaser().dismiss?.click();
    expect(teaser().box.hidden).toBe(true);

    widget.destroy();
    widget.init();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    expect(teaser().box.hidden).toBe(true);
  });
});
