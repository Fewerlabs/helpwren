import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Expandable, type ExpandableProps } from "./expandable";

const meta = {
  title: "Base/Expandable",
  component: Expandable,
  args: { open: true, orientation: "vertical", duration: 200, fade: true },
  argTypes: {
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"] },
    duration: { control: { type: "range", min: 0, max: 1000, step: 50 } },
  },
} satisfies Meta<typeof Expandable>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ open: initial, ...props }: ExpandableProps) {
  const [open, setOpen] = useState(initial);
  const id = useId();

  return (
    <div className="max-w-sm">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
        }}
      >
        Contact details
        <Icon
          name="caret-down"
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        />
      </Button>
      <Expandable id={id} {...props} open={open}>
        <div className="border-line bg-card mt-2 rounded-xl p-4 text-sm">
          <p className="font-medium">Ada Lovelace</p>
          <p className="text-muted-foreground">ada@example.com</p>
          <p className="text-muted-foreground mt-2">
            Customer since March. Three past conversations, all resolved.
          </p>
        </div>
      </Expandable>
    </div>
  );
}

export const Default: Story = { render: (args) => <Demo {...args} /> };
export const Closed: Story = { args: { open: false }, render: (args) => <Demo {...args} /> };
export const Slow: Story = { args: { duration: 600 }, render: (args) => <Demo {...args} /> };
export const Dark: Story = {
  render: (args) => <Demo {...args} />,
  globals: { theme: "dark" },
};
