import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator";

const meta = {
  title: "Base/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase() {
  return (
    <div className="max-w-sm">
      <p>Conversation</p>
      <Separator className="my-3" />
      <div className="flex h-5 items-center gap-3 text-sm">
        <span>Chat</span>
        <Separator orientation="vertical" />
        <span>Tickets</span>
        <Separator orientation="vertical" />
        <span>Articles</span>
      </div>
    </div>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
