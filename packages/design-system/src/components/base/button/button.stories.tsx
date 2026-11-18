import type { Meta, StoryObj } from "@storybook/react-vite";

import { Icon } from "../icon/icon";
import { Button } from "./button";

const meta = {
  title: "Base/Button",
  component: Button,
  args: { children: "Send reply", variant: "primary", size: "md", loading: false, disabled: false },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "ghost", "destructive", "link"],
    },
    size: { control: "inline-radio", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Send reply</Button>
        <Button variant="secondary">Assign</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">View article</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="sm" variant="secondary">
          Small
        </Button>
        <Button>
          <Icon name="paper-plane-tilt" />
          With icon
        </Button>
        <Button size="icon" variant="secondary" aria-label="Attach a file">
          <Icon name="paperclip" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="More actions">
          <Icon name="dots-three" weight="bold" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Disabled</Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
        <Button loading>Sending</Button>
        <Button variant="secondary" loading>
          Saving
        </Button>
        <Button asChild variant="secondary">
          <a href="https://helpwren.fewerlabs.dev">Rendered as a link</a>
        </Button>
      </div>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
