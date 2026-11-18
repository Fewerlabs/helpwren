import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../label/label";
import { Switch } from "./switch";

const meta = {
  title: "Base/Switch",
  component: Switch,
  args: { "aria-label": "Email notifications" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const rows = [
  { id: "sw-off", label: "Off", props: {} },
  { id: "sw-on", label: "On", props: { defaultChecked: true } },
  { id: "sw-disabled", label: "Disabled", props: { disabled: true } },
  { id: "sw-disabled-on", label: "Disabled, on", props: { disabled: true, defaultChecked: true } },
] as const;

function Showcase() {
  return (
    <div className="grid gap-5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <Switch id={row.id} {...row.props} />
          <Label htmlFor={row.id}>{row.label}</Label>
        </div>
      ))}
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
