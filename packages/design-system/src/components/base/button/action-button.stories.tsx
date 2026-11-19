import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActionButton } from "./action-button";

const meta = {
  title: "Base/ActionButton",
  component: ActionButton,
  args: { icon: "user-plus", label: "Invite", variant: "primary", collapseBelow: "sm" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost"] },
    collapseBelow: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof ActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A row's actions: worded on a wide screen, icons with tooltips on a narrow one. */
export const InARow: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <ActionButton
        variant="ghost"
        icon="shield-check"
        label="Make admin"
        aria-label="Make Sam Rivera an admin"
      />
      <ActionButton
        variant="ghost"
        icon="user-minus"
        label="Deactivate"
        aria-label="Deactivate Sam Rivera"
        className="text-destructive hover:text-destructive"
      />
    </div>
  ),
};
