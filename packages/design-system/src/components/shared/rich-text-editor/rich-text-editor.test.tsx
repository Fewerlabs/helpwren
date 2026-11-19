import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../../base/tooltip/tooltip";
import { type RichTextNode } from "../rich-text/rich-text";
import { blockChoices, matchBlocks } from "./blocks";
import { RichTextEditor, type RichTextEditorProps } from "./rich-text-editor";

// The editor scrolls the caret into view after a change, which asks the browser where the text
// is. jsdom lays nothing out, so these answer "nowhere". Typing into the text itself, the slash
// menu and the bar over a selection need a real browser: the stories test those.
beforeAll(() => {
  const nowhere = new DOMRect(0, 0, 0, 0);
  Range.prototype.getBoundingClientRect = () => nowhere;
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
  document.elementFromPoint = () => null;
});

const hello: RichTextNode = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
};

async function setup(props: Partial<RichTextEditorProps> = {}) {
  const onChange = vi.fn<(doc: RichTextNode) => void>();
  render(
    <TooltipProvider>
      <RichTextEditor
        aria-label="Article body"
        defaultValue={hello}
        onChange={onChange}
        {...props}
      />
    </TooltipProvider>,
  );
  const body = await screen.findByRole("textbox", { name: "Article body" });
  const latest = () => onChange.mock.lastCall?.[0];
  const add = async (block: string) => {
    await userEvent.click(screen.getByRole("button", { name: "Add block" }));
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^${block}`) }));
    // The caret goes back to the writing on the next frame. Opening the menu again before
    // then would see focus leave it and close.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  };
  return { body, onChange, latest, add };
}

describe("RichTextEditor", () => {
  it("shows the document it was given, in a labelled writing area with no toolbar", async () => {
    const { body } = await setup();
    expect(body).toHaveTextContent("Hello");
    expect(body).toHaveAttribute("aria-multiline", "true");
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("turns the current block into a heading from the block menu", async () => {
    const { latest, add } = await setup();
    await add("Heading");
    expect(latest()?.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    await add("Text");
    expect(latest()?.content?.[0]).toMatchObject({ type: "paragraph" });
  });

  it("makes lists, quotes and code blocks", async () => {
    const { latest, add } = await setup();
    await add("Bulleted list");
    expect(latest()?.content?.[0]?.type).toBe("bulletList");
    await add("Numbered list");
    expect(latest()?.content?.[0]?.type).toBe("orderedList");
    await add("Numbered list");
    await add("Quote");
    expect(latest()?.content?.[0]?.type).toBe("blockquote");
  });

  it("wraps the block in a callout and changes its tone", async () => {
    const { latest, add } = await setup();
    await add("Tip");
    expect(latest()?.content?.[0]).toMatchObject({
      type: "callout",
      attrs: { tone: "tip" },
      content: [{ type: "paragraph" }],
    });
    await add("Warning");
    expect(latest()?.content?.[0]).toMatchObject({ type: "callout", attrs: { tone: "warning" } });
  });

  it("uploads a chosen picture and puts it in the document", async () => {
    const uploadImage = vi.fn(() => Promise.resolve("https://example.com/chart.png"));
    const { latest } = await setup({ uploadImage });

    await userEvent.click(screen.getByRole("button", { name: "Add block" }));
    expect(await screen.findByRole("button", { name: /^Picture/ })).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText("Picture file"),
      new File(["x"], "chart.png", { type: "image/png" }),
    );

    await waitFor(() => {
      expect(JSON.stringify(latest())).toContain('"src":"https://example.com/chart.png"');
    });
    expect(uploadImage).toHaveBeenCalledOnce();
  });

  it("offers no pictures without a way to store them", async () => {
    await setup();
    await userEvent.click(screen.getByRole("button", { name: "Add block" }));
    await screen.findByRole("button", { name: /^Heading/ });
    expect(screen.queryByRole("button", { name: /^Picture/ })).toBeNull();
  });

  it("cannot be changed while disabled", async () => {
    const { body } = await setup({ disabled: true });
    expect(body).toHaveAttribute("contenteditable", "false");
    expect(screen.queryByRole("button", { name: "Add block" })).toBeNull();
  });
});

describe("matchBlocks", () => {
  it("offers every block until something is typed", () => {
    expect(matchBlocks(blockChoices, "")).toHaveLength(blockChoices.length);
  });

  it("narrows by the start of a word in the name or its other names", () => {
    expect(matchBlocks(blockChoices, "head").map((choice) => choice.id)).toEqual(["heading"]);
    expect(matchBlocks(blockChoices, "call").map((choice) => choice.id)).toEqual([
      "note",
      "tip",
      "warning",
    ]);
    expect(matchBlocks(blockChoices, "zzz")).toEqual([]);
  });
});
