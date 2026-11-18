import type { Meta, StoryObj } from "@storybook/react-vite";

import { Logo } from "./logo";

const meta = {
  title: "Illustrations/Logo",
  component: Logo,
  args: { variant: "lockup", size: 56 },
  argTypes: {
    variant: { control: "inline-radio", options: ["mark", "lockup"] },
    size: { control: { type: "range", min: 16, max: 132, step: 4 } },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const sizes = [132, 56, 32, 24, 16] as const;

/** Detail drops as the mark shrinks: brow first, then wing, then eye. The line gets heavier. */
export const Sizes: Story = {
  render: () => (
    <ul className="flex flex-wrap items-end gap-8">
      {sizes.map((size) => (
        <li key={size} className="flex flex-col items-center gap-2">
          <Logo size={size} label={`Helpwren mark at ${size} pixels`} />
          <span className="text-muted-foreground font-mono text-xs">{size}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Lockups: Story = {
  render: () => (
    <div className="grid gap-6">
      <Logo variant="lockup" size={72} />
      <Logo variant="lockup" size={32} />
      <Logo variant="lockup" size={20} />
    </div>
  ),
};

export const Dark: Story = { globals: { theme: "dark" } };
