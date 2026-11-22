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

/** An action that runs at once keeps the menu open, with a spinner, until it is done. */
export const RunsInPlace: StoryObj<typeof meta> = {
  args: {
    target: "Paying a deposit",
    items: [
      { label: "Edit", icon: "pencil-simple", onSelect: () => undefined },
      {
        label: "Publish",
        icon: "check-circle",
        onSelect: () => new Promise((resolve) => setTimeout(resolve, 1500)),
      },
      {
        label: "Move to",
        icon: "folder",
        choices: [
          {
            label: "Bookings",
            onSelect: () => new Promise((resolve) => setTimeout(resolve, 1500)),
          },
          { label: "Account and payments", onSelect: () => undefined },
        ],
      },
      { label: "Delete", icon: "trash", destructive: true, onSelect: () => undefined },
    ],
  },
};
