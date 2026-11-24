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

/**
 * The screen, as `matchMedia` reports it: wide enough for the panel to float, or a phone's.
 * `resize` changes it and tells whoever is listening.
 */
const screenSize = {
  floating: true,
  listeners: new Set<() => void>(),
  resize(floating: boolean) {
    this.floating = floating;
    for (const listener of this.listeners) listener();
  },
};

beforeEach(() => {
  answer = {};
  screenSize.floating = true;
  screenSize.listeners.clear();
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return screenSize.floating;
    },
    addEventListener: (_: "change", listener: () => void) => {
      screenSize.listeners.add(listener);
    },
    removeEventListener: (_: "change", listener: () => void) => {
      screenSize.listeners.delete(listener);
    },
  }));
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

  it("tells the chat the page's audience", () => {
    widget.init({ audience: "business" });
    expect(parts().frame.src).toBe(`${APP}/embed?source=web&audience=business`);
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
      {
        channel: "helpwren",
        type: "hello",
        page: { url: window.location.href, title: "" },
        closable: true,
        open: false,
        identified: false,
      },
      APP,
    );
  });
});

describe("who the visitor is", () => {
  function ready() {
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    receive({ channel: "helpwren", type: "ready" });
    return post;
  }
  const sent = (post: ReturnType<typeof ready>, type: string) =>
    post.mock.calls
      .map(([message]) => message as Record<string, unknown>)
      .filter((message) => message.type === type);

  it("says in its greeting that a user is coming, then hands over their token", async () => {
    widget.identify({ token: "signed-token" });
    widget.init();
    const post = ready();
    await vi.waitFor(() => {
      expect(sent(post, "identify")).toHaveLength(1);
    });

    expect(sent(post, "hello")[0]).toMatchObject({ identified: true });
    expect(post).toHaveBeenCalledWith(
      { channel: "helpwren", type: "identify", token: "signed-token" },
      APP,
    );
  });

  it("never puts the token in the frame's address", () => {
    widget.identify({ token: "signed-token" });
    widget.init();
    expect(parts().frame.src).not.toContain("signed-token");
  });

  it("fetches the token from a function, and once more when the chat says it expired", async () => {
    const token = vi.fn().mockResolvedValueOnce("old-token").mockResolvedValueOnce("new-token");
    const heard = vi.fn();
    widget.on("identity", heard);
    widget.init();
    const post = ready();

    widget.identify({ token });
    await vi.waitFor(() => {
      expect(sent(post, "identify")).toHaveLength(1);
    });
    receive({ channel: "helpwren", type: "identity", state: "failed", reason: "expired" });
    await vi.waitFor(() => {
      expect(sent(post, "identify")).toHaveLength(2);
    });
    expect(sent(post, "identify")[1]).toMatchObject({ token: "new-token" });
    expect(heard).not.toHaveBeenCalled();

    // A second expiry in a row is the page's to deal with, not something to retry for ever.
    receive({ channel: "helpwren", type: "identity", state: "failed", reason: "expired" });
    expect(heard).toHaveBeenCalledWith({ state: "failed", reason: "expired" });
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("passes on labels given without a token, and does not claim a user is coming", () => {
    widget.init();
    const post = ready();

    widget.identify({ id: "42", name: "Ada Obi", email: "ada@example.com" });

    expect(sent(post, "hello")[0]).toMatchObject({ identified: false });
    expect(sent(post, "identify")[0]).toEqual({
      channel: "helpwren",
      type: "identify",
      details: { id: "42", name: "Ada Obi", email: "ada@example.com" },
    });
  });

  it("tells the page when the chat has signed in, and when it could not", () => {
    const heard = vi.fn();
    widget.on("identity", heard);
    widget.init();
    ready();

    receive({ channel: "helpwren", type: "identity", state: "user" });
    receive({ channel: "helpwren", type: "identity", state: "failed", reason: "rejected" });
    receive({ channel: "helpwren", type: "identity", state: "failed", reason: "made-up" });

    expect(heard.mock.calls).toEqual([
      [{ state: "user" }],
      [{ state: "failed", reason: "rejected" }],
    ]);
  });

  it("forgets the visitor on reset, and says so again the next time the frame loads", async () => {
    widget.identify({ token: "signed-token" });
    widget.init();
    const post = ready();
    await vi.waitFor(() => {
      expect(sent(post, "identify")).toHaveLength(1);
    });

    widget.reset();
    expect(post).toHaveBeenCalledWith({ channel: "helpwren", type: "reset" }, APP);

    receive({ channel: "helpwren", type: "ready" });
    expect(sent(post, "hello").at(-1)).toMatchObject({ identified: false });
    expect(sent(post, "identify")).toHaveLength(1);
  });

  it("sends the page's context when it is set, and again each time the frame loads", () => {
    widget.setContext({ plan: "pro" });
    widget.init();
    const post = ready();
    widget.setContext({ plan: "pro", orderId: 1234 });

    expect(sent(post, "context").map((message) => message.context)).toEqual([
      { plan: "pro" },
      { plan: "pro", orderId: 1234 },
    ]);
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

  it("tells the chat when it opens and closes, so it is live only while showing", () => {
    widget.init();
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    receive({ channel: "helpwren", type: "ready" });

    widget.show();
    expect(post).toHaveBeenLastCalledWith({ channel: "helpwren", type: "panel", open: true }, APP);
    widget.hide();
    expect(post).toHaveBeenLastCalledWith({ channel: "helpwren", type: "panel", open: false }, APP);
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
  it("stays hidden until the install answers, so it never shows the default colour first", async () => {
    answer = { accent: "#f1635e", accentInk: "#ffffff" };
    widget.init();
    expect(host().style.display).toBe("none");

    await vi.waitFor(() => {
      expect(host().style.display).toBe("");
    });
    expect(host().style.getPropertyValue("--hw-accent-fill")).toContain("#f1635e");
  });

  it("shows itself with its defaults when the install cannot be asked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    widget.init();

    await vi.waitFor(() => {
      expect(host().style.display).toBe("");
    });
  });

  it("removes itself and says why when the install does not allow this site", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    answer = { allowed: false };
    widget.init();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-helpwren]")).toBeNull();
    });
    expect(error).toHaveBeenCalledWith(expect.stringContaining("allowed domains"));
    error.mockRestore();
  });

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

  it("shows the wren in a chat bubble when asked, and the plain bubble again after", async () => {
    answer = { launcher: "wren" };
    widget.init();
    const marks = () => [...(parts().launcher?.querySelectorAll('[data-icon="open"]') ?? [])];
    expect(marks().map((mark) => mark.getAttribute("data-mark"))).toEqual(["chat"]);

    await vi.waitFor(() => {
      expect(marks().map((mark) => mark.getAttribute("data-mark"))).toEqual(["wren"]);
    });
    // One colour, taken from the launcher, so it follows the install's brand.
    expect(marks()[0]?.getAttribute("fill")).toBe("currentColor");
    expect(marks()[0]?.outerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("swaps the launcher's icon as a preview changes it", () => {
    widget.init({ preview: { appearance: { launcher: "wren" } } });
    const mark = () => parts().launcher?.querySelector('[data-icon="open"]');
    expect(mark()?.getAttribute("data-mark")).toBe("wren");

    widget.preview({ appearance: { launcher: "chat" } });
    expect(mark()?.getAttribute("data-mark")).toBe("chat");

    // A logo was asked for and there is none, so the bubble stays.
    widget.preview({ appearance: { launcher: "logo" } });
    expect(mark()?.getAttribute("data-mark")).toBe("chat");
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

describe("theme", () => {
  it("is light unless the page asks, and leaves the address alone", () => {
    widget.init();
    expect(new URL(parts().frame.src).searchParams.has("theme")).toBe(false);
    expect(host().dataset.theme).toBe("light");
  });

  it("starts the chat in the page's theme, and tells it when the page changes", () => {
    widget.init({ theme: "dark" });
    const { frame } = parts();
    expect(new URL(frame.src).searchParams.get("theme")).toBe("dark");
    expect(host().dataset.theme).toBe("dark");
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");

    receive({ channel: "helpwren", type: "ready" });
    // Already in the address, so not said again.
    expect(post).not.toHaveBeenCalledWith(expect.objectContaining({ type: "theme" }), APP);

    widget.update({ theme: "system" });
    expect(host().dataset.theme).toBe("system");
    expect(post).toHaveBeenLastCalledWith(
      { channel: "helpwren", type: "theme", theme: "system" },
      APP,
    );

    // A reloaded frame still has the old address, so it hears the theme again.
    post.mockClear();
    receive({ channel: "helpwren", type: "ready" });
    expect(post).toHaveBeenCalledWith({ channel: "helpwren", type: "theme", theme: "system" }, APP);
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

describe("the host page's own controls", () => {
  it("fills a container of the page's own, always open, with nothing to close", () => {
    const container = document.createElement("div");
    container.id = "support";
    document.body.append(container);
    widget.init({ container: "#support", mode: "inline" });

    expect(container.contains(host())).toBe(true);
    expect(host().dataset.mode).toBe("inline");
    const { frame, panel, launcher } = parts();
    expect(launcher).toBeNull();
    expect(panel.dataset.open).toBe("true");
    widget.hide();
    expect(widget.isOpen()).toBe(true);

    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    receive({ channel: "helpwren", type: "ready" });
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hello", closable: false }),
      APP,
    );
  });

  it("opens and closes from the page's own buttons, and keeps them in step", () => {
    const button = document.createElement("button");
    button.className = "help";
    document.body.append(button);
    const opened = vi.fn();
    const closed = vi.fn();
    widget.on("open", opened);
    widget.on("close", closed);
    widget.init({ launcher: false, trigger: ".help" });

    expect(parts().launcher).toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.click();
    expect(widget.isOpen()).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(opened).toHaveBeenCalledOnce();

    widget.toggle();
    expect(widget.isOpen()).toBe(false);
    expect(closed).toHaveBeenCalledOnce();

    // Taken off the page, the button is the page's own again.
    widget.destroy();
    button.click();
    expect(button.hasAttribute("aria-expanded")).toBe(false);
  });

  it("keeps the page's own look over the install's, within limits", async () => {
    answer = { position: "left", accent: "#1d4ed8", offsetX: 40 };
    widget.init({
      appearance: { position: "right", accent: "#be123c" },
      layout: { width: 5000, height: 500, zIndex: 50 },
      welcome: false,
    });
    await vi.waitFor(() => {
      expect(host().style.getPropertyValue("--hw-x")).toBe("40px");
    });
    // The install set the spacing; the page's own choices win where it made them.
    expect(host().dataset.position).toBe("right");
    expect(host().style.getPropertyValue("--hw-accent")).toBe("#be123c");
    expect(host().style.getPropertyValue("--hw-w")).toBe("640px");
    expect(host().style.getPropertyValue("--hw-h")).toBe("500px");
    expect(host().style.getPropertyValue("--hw-z")).toBe("50");

    widget.update({ appearance: { position: "left" }, layout: { width: 360 } });
    expect(host().dataset.position).toBe("left");
    expect(host().style.getPropertyValue("--hw-w")).toBe("360px");
  });

  it("starts a conversation with a draft, and says when the chat is ready", () => {
    const ready = vi.fn();
    widget.on("ready", ready);
    widget.init();
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");

    receive({ channel: "helpwren", type: "ready" });
    receive({ channel: "helpwren", type: "ready" });
    expect(ready).toHaveBeenCalledOnce();

    widget.startConversation("I need help with order 1042");
    expect(widget.isOpen()).toBe(true);
    expect(post).toHaveBeenCalledWith(
      { channel: "helpwren", type: "start", draft: "I need help with order 1042" },
      APP,
    );
  });
});

describe("where the visitor is", () => {
  function frameWindow() {
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    return frame.contentWindow;
  }

  it("says where the visitor came from in its greeting", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://search.example.org/",
      configurable: true,
    });
    widget.init();
    const post = vi.spyOn(frameWindow(), "postMessage");
    receive({ channel: "helpwren", type: "ready" });

    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hello", referrer: "https://search.example.org/" }),
      APP,
    );
    Reflect.deleteProperty(document, "referrer");
  });

  it("tells the chat when a single-page app moves to another page, and stops when removed", async () => {
    const start = window.location.href;
    widget.init();
    receive({ channel: "helpwren", type: "ready" });
    const post = vi.spyOn(frameWindow(), "postMessage");

    window.history.pushState(null, "", "/pricing");
    document.title = "Pricing";
    await vi.waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        {
          channel: "helpwren",
          type: "page",
          page: { url: new URL("/pricing", start).href, title: "Pricing" },
          visible: true,
        },
        APP,
      );
    });

    // The same address again is not a new page.
    post.mockClear();
    window.history.replaceState(null, "", "/pricing");
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(post).not.toHaveBeenCalled();

    widget.destroy();
    window.history.pushState(null, "", start);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(post).not.toHaveBeenCalled();
    document.title = "";
  });

  it("tells the chat when the tab is hidden", () => {
    widget.init();
    receive({ channel: "helpwren", type: "ready" });
    const post = vi.spyOn(frameWindow(), "postMessage");

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page", visible: false }),
      APP,
    );
    Reflect.deleteProperty(document, "visibilityState");
  });
});

describe("a new reply beside the launcher", () => {
  const CONVERSATION = "0b7c4f1e-8a5d-4c2b-9f3e-1a2b3c4d5e6f";
  const teaser = () => {
    const box = host().shadowRoot?.querySelector<HTMLElement>(".teaser");
    if (!box) throw new Error("There is no teaser.");
    return box;
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows the reply's start, opens its conversation when clicked, and goes when read", () => {
    widget.init();
    receive({ channel: "helpwren", type: "ready" });
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");

    receive({
      channel: "helpwren",
      type: "unread",
      count: 1,
      latest: { conversationId: CONVERSATION, preview: "Can I <i>help</i> you choose a plan?" },
    });
    expect(teaser().hidden).toBe(false);
    // Shown as text, never read as markup.
    expect(teaser().textContent).toContain("Can I <i>help</i> you choose a plan?");
    expect(parts().badge?.textContent).toBe("1");

    teaser().querySelector<HTMLButtonElement>(".teaser-open")?.click();
    expect(post).toHaveBeenCalledWith(
      { channel: "helpwren", type: "open", conversationId: CONVERSATION },
      APP,
    );
    expect(parts().panel.dataset.open).toBe("true");
    expect(teaser().hidden).toBe(true);

    widget.hide();
    receive({ channel: "helpwren", type: "unread", count: 0 });
    expect(teaser().hidden).toBe(true);
  });

  it("stays dismissed until a newer reply arrives", () => {
    widget.init();
    receive({ channel: "helpwren", type: "ready" });
    const latest = { conversationId: CONVERSATION, preview: "Hello" };
    receive({ channel: "helpwren", type: "unread", count: 1, latest });
    teaser().querySelector<HTMLButtonElement>(".teaser-close")?.click();
    expect(teaser().hidden).toBe(true);

    receive({
      channel: "helpwren",
      type: "unread",
      count: 2,
      latest: { ...latest, preview: "Are you still there?" },
    });
    expect(teaser().hidden).toBe(false);
  });

  it.each([
    ["an id that is not one", { conversationId: "../../x", preview: "Hi" }],
    ["a preview that is too long", { conversationId: CONVERSATION, preview: "x".repeat(301) }],
  ])("ignores an unread message with %s", (_, latest) => {
    widget.init();
    receive({ channel: "helpwren", type: "unread", count: 1, latest });
    expect(parts().badge?.hidden).toBe(true);
  });
});

describe("contextual help", () => {
  function ready() {
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    receive({ channel: "helpwren", type: "ready" });
    return post;
  }
  const sent = (post: ReturnType<typeof ready>, type: string) =>
    post.mock.calls
      .map(([message]) => message as Record<string, unknown>)
      .filter((message) => message.type === type);

  const articles = [
    {
      title: "How refunds work",
      summary: "When the money comes back.",
      slug: "how-refunds-work",
      url: "https://help.example.com/help/billing/how-refunds-work",
    },
    { title: "Chat only", summary: null, slug: "chat-only", url: null },
  ];

  /** Answers the inline lists' requests with these articles, and the rest with `answer`. */
  function answerArticles(list: unknown = articles) {
    const fetch = vi.fn((input: URL | string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(String(input).endsWith("/api/articles/search") ? list : answer),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("sends a page's filter apart from the values for the team", () => {
    widget.init();
    const post = ready();
    widget.setContext({ plan: "pro", filter: { tags: { any: ["refunds"] }, limit: 3 } });

    expect(sent(post, "context").at(-1)).toEqual({
      channel: "helpwren",
      type: "context",
      context: { plan: "pro" },
      filter: { tags: { any: ["refunds"] }, limit: 3 },
    });
  });

  it("sends the filter again each time the frame loads", () => {
    widget.setContext({ filter: { collection: "bookings" } });
    widget.init();
    const post = ready();
    expect(sent(post, "context")).toEqual([
      { channel: "helpwren", type: "context", context: {}, filter: { collection: "bookings" } },
    ]);
  });

  it("fills an inline list with links to the articles its filter picks", async () => {
    const fetch = answerArticles();
    const block = document.createElement("div");
    block.dataset.helpwrenHelp = '{"tags":{"any":["refunds"]},"limit":3}';
    document.body.append(block);
    widget.init();

    await vi.waitFor(() => {
      expect(block.dataset.helpwrenState).toBe("ready");
    });
    const request = fetch.mock.calls.find(([input]) => String(input).endsWith("/search"));
    expect(String(request?.[0])).toBe(`${APP}/api/articles/search`);
    const links = [...block.querySelectorAll("a")];
    expect(links.map((link) => link.textContent)).toEqual([
      "How refunds workWhen the money comes back.",
      "Chat only",
    ]);
    expect(links[0]?.href).toBe("https://help.example.com/help/billing/how-refunds-work");
    expect(links[1]?.href).toBe(`${APP}/help`);
    expect(block.hasAttribute("aria-busy")).toBe(false);
  });

  it("opens the article in the chat when a link is clicked", async () => {
    answerArticles();
    const block = document.createElement("div");
    block.dataset.helpwrenHelp = "{}";
    document.body.append(block);
    widget.init();
    const post = ready();
    await vi.waitFor(() => {
      expect(block.querySelector("a")).not.toBeNull();
    });

    block.querySelector("a")?.click();
    expect(widget.isOpen()).toBe(true);
    expect(sent(post, "article")).toEqual([
      { channel: "helpwren", type: "article", slug: "how-refunds-work" },
    ]);
  });

  it("fills a list added to the page later, and draws nothing when nothing matches", async () => {
    answerArticles([]);
    widget.init();
    const block = document.createElement("div");
    block.setAttribute("data-helpwren-help", '{"q":"nothing"}');
    document.body.append(block);

    await vi.waitFor(() => {
      expect(block.dataset.helpwrenState).toBe("empty");
    });
    expect(block.children).toHaveLength(0);
  });

  it("marks a list whose filter is not JSON, and asks for nothing", () => {
    const fetch = answerArticles();
    const block = document.createElement("div");
    block.dataset.helpwrenHelp = "tags: refunds";
    document.body.append(block);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    widget.init();

    expect(block.dataset.helpwrenState).toBe("error");
    expect(fetch.mock.calls.some(([input]) => String(input).endsWith("/search"))).toBe(false);
  });

  it("opens an article by its slug once the chat is ready", () => {
    widget.init();
    widget.openArticle("how-refunds-work");
    expect(widget.isOpen()).toBe(true);
    const post = ready();
    expect(sent(post, "article")).toEqual([
      { channel: "helpwren", type: "article", slug: "how-refunds-work" },
    ]);
  });

  it("opens the help for one collection, or several, once the chat is ready", () => {
    widget.init();
    widget.openHelp("catalog");
    expect(widget.isOpen()).toBe(true);
    const post = ready();
    widget.openHelp(["catalog", "bookings"]);
    widget.openHelp();
    expect(sent(post, "help")).toEqual([
      { channel: "helpwren", type: "help", collections: ["catalog"] },
      { channel: "helpwren", type: "help", collections: ["catalog", "bookings"] },
      { channel: "helpwren", type: "help", collections: [] },
    ]);
  });

  it("finds articles for a list of the page's own, keeping only well-formed ones", async () => {
    answerArticles([...articles, { title: "No slug" }, { ...articles[0], url: "javascript:x" }]);
    await expect(widget.findArticles({ collection: "billing" })).resolves.toEqual(articles);
  });
});

describe("reading size", () => {
  function ready() {
    const { frame } = parts();
    if (!frame.contentWindow) throw new Error("The frame has no window.");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    receive({ channel: "helpwren", type: "ready" });
    return post;
  }
  const layouts = (post: ReturnType<typeof ready>) =>
    post.mock.calls
      .map(([message]) => message as Record<string, unknown>)
      .filter((message) => message.type === "layout")
      .map(({ expandable, expanded }) => ({ expandable, expanded }));
  const size = (wanted: string) => {
    receive({ channel: "helpwren", type: "size", size: wanted });
  };

  it("grows the open panel when the chat asks, and goes back when asked", () => {
    widget.init();
    const post = ready();
    widget.show();
    expect(layouts(post)).toEqual([{ expandable: true, expanded: false }]);

    size("expanded");
    expect(host().dataset.expanded).toBe("");
    size("normal");
    expect(host().dataset.expanded).toBeUndefined();
    expect(layouts(post)).toEqual([
      { expandable: true, expanded: false },
      { expandable: true, expanded: true },
      { expandable: true, expanded: false },
    ]);
  });

  it("goes back to its usual size when the panel closes", () => {
    widget.init();
    const post = ready();
    widget.show();
    size("expanded");

    widget.hide();
    expect(host().dataset.expanded).toBeUndefined();
    expect(layouts(post).at(-1)).toEqual({ expandable: true, expanded: false });
    widget.show();
    expect(host().dataset.expanded).toBeUndefined();
  });

  it("does not grow a closed panel", () => {
    widget.init();
    ready();
    size("expanded");
    expect(host().dataset.expanded).toBeUndefined();
  });

  it("is ignored when the chat is inline", () => {
    const container = document.createElement("div");
    container.id = "support";
    document.body.append(container);
    widget.init({ container: "#support", mode: "inline" });
    const post = ready();

    size("expanded");
    expect(host().dataset.expanded).toBeUndefined();
    expect(layouts(post)).toEqual([{ expandable: false, expanded: false }]);
  });

  it("does not grow on a phone's screen, and goes back if the screen becomes one", () => {
    screenSize.floating = false;
    widget.init();
    const post = ready();
    widget.show();
    size("expanded");
    expect(host().dataset.expanded).toBeUndefined();

    screenSize.resize(true);
    size("expanded");
    expect(host().dataset.expanded).toBe("");
    screenSize.resize(false);
    expect(host().dataset.expanded).toBeUndefined();
    expect(layouts(post)).toEqual([
      { expandable: false, expanded: false },
      { expandable: true, expanded: false },
      { expandable: true, expanded: true },
      { expandable: false, expanded: false },
    ]);
  });

  it("ignores a size it does not know", () => {
    widget.init();
    ready();
    widget.show();
    size("huge");
    expect(host().dataset.expanded).toBeUndefined();
  });

  it("stops listening to the screen once destroyed", () => {
    widget.init();
    widget.destroy();
    expect(screenSize.listeners.size).toBe(0);
  });
});
