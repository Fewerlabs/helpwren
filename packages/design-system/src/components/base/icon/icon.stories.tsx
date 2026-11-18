import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Icon, type IconWeight } from "./icon";
import { iconNames } from "./registry";

const weights: readonly IconWeight[] = ["thin", "light", "regular", "bold", "fill", "duotone"];

const meta = {
  title: "Base/Icon",
  component: Icon,
  args: { name: "chat-circle", weight: "regular", mirrored: false },
  argTypes: {
    name: { control: "select", options: iconNames },
    weight: { control: "inline-radio", options: weights },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "size-6" },
};

/** Without a size class an icon is `1em` and takes the colour of the text around it. */
export const FollowsText: Story = {
  render: (args) => (
    <div className="space-y-2">
      <p className="text-sm">
        <Icon {...args} /> Small text
      </p>
      <p className="text-pen text-2xl">
        <Icon {...args} /> Large red-pen text
      </p>
    </div>
  ),
};

export const Weights: Story = {
  render: (args) => (
    <ul className="flex flex-wrap gap-6">
      {weights.map((weight) => (
        <li key={weight} className="flex flex-col items-center gap-2">
          <Icon {...args} weight={weight} className="size-8" />
          <span className="text-muted-foreground font-mono text-xs">{weight}</span>
        </li>
      ))}
    </ul>
  ),
};

/** With a label the icon is announced as an image. Decorative icons are hidden. */
export const Labelled: Story = {
  args: { name: "warning", label: "Warning", className: "size-6 text-pen" },
};

export const Mirrored: Story = {
  args: { name: "arrow-right", mirrored: true, className: "size-6" },
};

function Gallery() {
  const [query, setQuery] = useState("");
  const matches = iconNames.filter((name) => name.includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <label className="flex max-w-sm flex-col gap-2 text-sm font-medium">
        Search icons
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="For example: caret"
          className="border-line bg-card min-h-target rounded-lg px-3 font-normal"
        />
      </label>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {matches.length} of {iconNames.length} icons
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
        {matches.map((name) => (
          <li
            key={name}
            className="border-line bg-card flex flex-col items-center gap-3 rounded-xl p-4"
          >
            <Icon name={name} className="size-6" />
            <code className="font-mono text-xs">{name}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every registered icon with its name. Use the name as the `name` prop. */
export const AllIcons: Story = {
  render: () => <Gallery />,
};
