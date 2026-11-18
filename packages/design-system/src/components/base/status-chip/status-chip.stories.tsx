import type { Meta, StoryObj } from "@storybook/react-vite";

import { statusNames } from "../../../tokens/tokens";
import { StatusChip } from "./status-chip";

const meta = {
  title: "Base/StatusChip",
  component: StatusChip,
  args: { status: "open", size: "md" },
  argTypes: {
    status: { control: "inline-radio", options: statusNames },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof StatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {statusNames.map((status) => (
          <StatusChip key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {statusNames.map((status) => (
          <StatusChip key={status} status={status} size="sm" />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip status="waiting">Waiting on you</StatusChip>
        <StatusChip status="resolved">Verified</StatusChip>
        <StatusChip status="closed">Offline</StatusChip>
      </div>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
