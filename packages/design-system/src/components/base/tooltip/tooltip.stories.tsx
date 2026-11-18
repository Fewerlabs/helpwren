import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Tooltip } from "./tooltip";

const meta = {
  title: "Base/Tooltip",
  component: Tooltip,
  args: {
    content: "Copy snippet",
    children: (
      <Button variant="secondary" size="icon" aria-label="Copy snippet">
        <Icon name="copy" />
      </Button>
    ),
  },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div className="p-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const Dark: Story = { args: { defaultOpen: true }, globals: { theme: "dark" } };
