import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "../field/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "Base/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function Options() {
  return (
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Team</SelectLabel>
        <SelectItem value="ada">Ada Lovelace</SelectItem>
        <SelectItem value="grace">Grace Hopper</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectItem value="none">Unassigned</SelectItem>
    </SelectContent>
  );
}

function Showcase() {
  return (
    <div className="grid max-w-sm gap-5">
      <Select defaultValue="ada">
        <Field label="Assignee">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Field>
        <Options />
      </Select>
      <Select>
        <Field label="Assignee" error="Choose who will handle this ticket.">
          <SelectTrigger>
            <SelectValue placeholder="Choose a person" />
          </SelectTrigger>
        </Field>
        <Options />
      </Select>
      <Select defaultValue="grace" disabled>
        <Field label="Assignee">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Field>
        <Options />
      </Select>
    </div>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };

export const Open: Story = {
  parameters: {
    a11y: {
      config: {
        // While the list is open Radix hides the rest of the page from assistive technology
        // and traps focus in the list, so the hidden trigger cannot actually be reached.
        rules: [{ id: "aria-hidden-focus", enabled: false }],
      },
    },
  },
  render: () => (
    <div className="max-w-sm">
      <Select defaultValue="ada" defaultOpen>
        <SelectTrigger aria-label="Assignee">
          <SelectValue />
        </SelectTrigger>
        <Options />
      </Select>
    </div>
  ),
};
