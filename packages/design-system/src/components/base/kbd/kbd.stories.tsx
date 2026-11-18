import type { Meta, StoryObj } from "@storybook/react-vite";

import { Kbd } from "./kbd";

const meta = {
  title: "Base/Kbd",
  component: Kbd,
  args: { children: "⌘K" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <p className="flex items-center gap-2 text-sm">
      Press <Kbd>⌘</Kbd>
      <Kbd>K</Kbd> to search, or <Kbd>Esc</Kbd> to close.
    </p>
  );
}

export const InText: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
