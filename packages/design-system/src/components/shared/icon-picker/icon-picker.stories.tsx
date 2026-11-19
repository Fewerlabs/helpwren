import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

import { CollectionIcon } from "../../base/collection-icon/collection-icon";
import { IconPicker, type IconPickerProps } from "./icon-picker";

// The icons arrive as a module of their own, which a busy test run can take a while to serve.
const LOADED = 10_000;

function Controlled(args: IconPickerProps) {
  const [value, setValue] = useState(args.value);
  return (
    <div className="grid max-w-sm gap-4">
      <IconPicker
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <CollectionIcon name={value} weight="duotone" className="text-foreground size-5" />
        <code className="font-mono text-xs">{value}</code>
      </p>
    </div>
  );
}

const meta = {
  title: "Shared/IconPicker",
  component: IconPicker,
  args: { label: "Icon", value: "rocket-launch", onChange: () => undefined },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof IconPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The chosen icon is scrolled into view when the picker opens. */
export const Default: Story = {};

/** Search reads Phosphor's tags as well as names: "money" finds coins, currencies and wallets. */
export const Search: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("listbox", { name: "Icon" }, { timeout: LOADED });
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search icons" }), "money");
    await expect(await canvas.findByRole("option", { name: "Wallet" })).toBeVisible();
    await userEvent.clear(canvas.getByRole("searchbox"));
    await userEvent.type(canvas.getByRole("searchbox"), "nothing like this");
    await expect(
      await canvas.findByRole("heading", { name: "No icons match “nothing like this”" }),
    ).toBeVisible();
  },
};

/** Down from the search moves into the grid; End jumps to the last icon, far below. */
export const Keyboard: Story = {
  args: { value: "acorn" },
  play: async ({ canvas, userEvent }) => {
    const list = await canvas.findByRole("listbox", { name: "Icon" }, { timeout: LOADED });
    await userEvent.click(canvas.getByRole("searchbox"));
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("option", { name: "Acorn" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await waitFor(async () => {
      const focused = document.activeElement;
      await expect(focused?.getAttribute("aria-posinset")).toBe(
        focused?.getAttribute("aria-setsize"),
      );
    });
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("youtube-logo", { selector: "code" })).toBeVisible();
    // Only the rows in view are drawn, never all of them.
    await expect(list.querySelectorAll("[role=option]").length).toBeLessThan(100);
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
