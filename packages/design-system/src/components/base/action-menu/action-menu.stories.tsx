import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActionMenu } from "./action-menu";

const meta = {
  title: "Base/ActionMenu",
  component: ActionMenu,
  args: {
    target: "Janet Agada",
    items: [
      { label: "Send invite again", icon: "envelope", onSelect: () => undefined },
      { label: "Copy invite link", icon: "link", onSelect: () => undefined },
      { label: "Set password", icon: "key", onSelect: () => undefined },
      { label: "Make admin", icon: "shield-check", onSelect: () => undefined },
      { label: "Deactivate", icon: "user-minus", destructive: true, onSelect: () => undefined },
    ],
  },
} satisfies Meta<typeof ActionMenu>;
export default meta;

export const RowActions: StoryObj<typeof meta> = {};
