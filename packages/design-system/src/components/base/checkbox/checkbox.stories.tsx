import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../label/label";
import { Checkbox } from "./checkbox";

const meta = {
  title: "Base/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Ask for email before chat" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const rows = [
  { id: "cb-unchecked", label: "Unchecked", props: {} },
  { id: "cb-checked", label: "Checked", props: { defaultChecked: true } },
  { id: "cb-invalid", label: "Invalid", props: { "aria-invalid": true } },
  { id: "cb-disabled", label: "Disabled", props: { disabled: true } },
  {
    id: "cb-disabled-checked",
    label: "Disabled, checked",
    props: { disabled: true, defaultChecked: true },
  },
] as const;

function Showcase() {
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <Checkbox id={row.id} {...row.props} />
          <Label htmlFor={row.id}>{row.label}</Label>
        </div>
      ))}
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
