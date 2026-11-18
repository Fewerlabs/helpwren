import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

import { RichText, type RichTextNode } from "../rich-text/rich-text";
import { sampleDoc } from "../rich-text/sample";
import { RichTextEditor, type RichTextEditorProps } from "./rich-text-editor";

const meta = {
  title: "Shared/RichTextEditor",
  component: RichTextEditor,
  args: {
    "aria-label": "Article body",
    defaultValue: sampleDoc,
    className: "border-rule bg-card max-w-3xl rounded-xl border [&_.hw-rich-text]:p-5",
  },
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: { type: "doc", content: [] } },
};

/** Typing a slash opens the block menu; the words after it narrow the list and Enter chooses. */
export const SlashMenu: Story = {
  args: { defaultValue: { type: "doc", content: [] } },
  play: async ({ canvas, userEvent }) => {
    const body = await canvas.findByRole("textbox", { name: "Article body" });
    await userEvent.click(body);
    await userEvent.keyboard("/head");
    await expect(await canvas.findByRole("button", { name: /^Heading/ })).toBeVisible();
    await userEvent.keyboard("{Enter}Set up");
    await expect(await canvas.findByRole("heading", { level: 2, name: "Set up" })).toBeVisible();
  },
};

/** Markdown shortcuts work as typed: two hashes and a space start a heading. */
export const MarkdownShortcuts: Story = {
  args: { defaultValue: { type: "doc", content: [] } },
  play: async ({ canvas, userEvent }) => {
    const body = await canvas.findByRole("textbox", { name: "Article body" });
    await userEvent.click(body);
    await userEvent.keyboard("## Before you start{Enter}- One");
    await expect(
      await canvas.findByRole("heading", { level: 2, name: "Before you start" }),
    ).toBeVisible();
    await expect(canvas.getByRole("list")).toHaveTextContent("One");
  },
};

/** Selecting words brings up the bar for bold, italic, code and links. */
export const SelectionBar: Story = {
  args: {
    defaultValue: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Keep two admins." }] }],
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = await canvas.findByRole("textbox", { name: "Article body" });
    const paragraph = body.querySelector("p");
    if (!paragraph) throw new Error("The paragraph was not drawn.");
    await userEvent.tripleClick(paragraph);
    // The bar is drawn outside the story's own element, floating over the page.
    const page = canvasElement.ownerDocument.body;
    const bold = await waitFor(() => {
      const button = page.querySelector<HTMLElement>('[aria-label="Bold"]');
      if (!button) throw new Error("The bar has not appeared yet.");
      return button;
    });
    await userEvent.click(bold);
    await waitFor(() => expect(body.querySelector("strong")).toHaveTextContent("Keep two admins."));
  },
};

/** With `uploadImage` the toolbar offers pictures. This one stands in for real storage. */
export const WithPictures: Story = {
  args: { uploadImage: (file: File) => Promise.resolve(URL.createObjectURL(file)) },
};

export const Disabled: Story = { args: { disabled: true } };
export const Dark: Story = { globals: { theme: "dark" } };

function SideBySide(props: RichTextEditorProps) {
  const [doc, setDoc] = useState<RichTextNode>(props.defaultValue);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <RichTextEditor {...props} onChange={setDoc} />
      <RichText doc={doc} className="border-rule rounded-xl border p-5" />
    </div>
  );
}

/** What is written on the left is what `RichText` draws on the right. */
export const WithRenderedResult: Story = { render: (args) => <SideBySide {...args} /> };
