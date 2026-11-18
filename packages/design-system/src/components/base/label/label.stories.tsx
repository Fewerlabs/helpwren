import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../input/input";
import { Label } from "./label";

const meta = {
  title: "Base/Label",
  component: Label,
  args: { children: "Brand name" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="label-story-input">Brand name</Label>
      <Input id="label-story-input" defaultValue="Glown" />
    </div>
  );
}

export const WithControl: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
