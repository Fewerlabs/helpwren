import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";

const meta = {
  title: "Base/Badge",
  component: Badge,
  args: { children: "billing", variant: "neutral" },
  argTypes: { variant: { control: "inline-radio", options: ["neutral", "outline", "accent"] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>billing</Badge>
      <Badge variant="outline">ios</Badge>
      <Badge variant="accent">12</Badge>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
