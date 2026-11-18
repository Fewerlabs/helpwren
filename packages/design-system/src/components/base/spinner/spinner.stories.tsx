import type { Meta, StoryObj } from "@storybook/react-vite";

import { Spinner } from "./spinner";

const meta = {
  title: "Base/Spinner",
  component: Spinner,
  args: { label: "Loading" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="flex items-center gap-6">
      <Spinner />
      <Spinner className="size-6" label="Loading messages" />
      <span className="text-moss inline-flex items-center gap-2 text-sm">
        <Spinner label="Sending" /> Sending
      </span>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
