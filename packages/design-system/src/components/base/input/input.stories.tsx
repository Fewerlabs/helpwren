import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "../field/field";
import { Input } from "./input";

const meta = {
  title: "Base/Input",
  component: Input,
  args: { placeholder: "you@example.com", "aria-label": "Email" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="grid max-w-sm gap-5">
      <Field label="Email">
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field label="Name" hint="Shown to the support team.">
        <Input defaultValue="Ada Lovelace" />
      </Field>
      <Field label="Email" error="Enter an email address, like name@example.com.">
        <Input type="email" defaultValue="ada@" />
      </Field>
      <Field label="Ticket number">
        <Input defaultValue="1042" disabled />
      </Field>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
