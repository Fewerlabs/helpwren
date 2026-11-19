import type { Meta, StoryObj } from "@storybook/react-vite";

import { RichText } from "./rich-text";
import { sampleDoc } from "./sample";

const meta = {
  title: "Shared/RichText",
  component: RichText,
  args: { doc: sampleDoc, className: "max-w-2xl" },
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };

/** Nodes it does not know and links it cannot trust are left out, not drawn. */
export const Untrusted: Story = {
  args: {
    doc: {
      type: "doc",
      content: [
        { type: "script", text: "alert(1)" },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This link is unsafe, so only its words are shown: " },
            {
              type: "text",
              text: "click me",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
            { type: "text", text: "." },
          ],
        },
      ],
    },
  },
};
