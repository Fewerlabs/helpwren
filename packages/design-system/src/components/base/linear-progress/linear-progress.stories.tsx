import type { Meta, StoryObj } from "@storybook/react-vite";

import { LinearProgress } from "./linear-progress";

const meta = {
  title: "Base/LinearProgress",
  component: LinearProgress,
  args: { label: "Loading" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LinearProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Indeterminate: Story = {};
export const Determinate: Story = { args: { value: 60, label: "Uploading" } };

/** Its usual place: pinned to the top edge of content that is already showing. */
export const OverContent: Story = {
  render: (args) => (
    <div className="border-line bg-card relative overflow-hidden rounded-xl">
      <LinearProgress {...args} className="absolute inset-x-0 top-0" />
      <ul className="divide-rule divide-y text-sm">
        <li className="p-3">Refund for order 1042</li>
        <li className="p-3">Cannot log in on iOS</li>
        <li className="p-3">Change booking date</li>
      </ul>
    </div>
  ),
};

export const Dark: Story = { globals: { theme: "dark" } };
