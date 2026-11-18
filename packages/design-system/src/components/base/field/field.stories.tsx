import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../input/input";
import { Textarea } from "../textarea/textarea";
import { Field } from "./field";

const meta = {
  title: "Base/Field",
  component: Field,
  args: {
    label: "Allowed domain",
    hint: "The widget only loads on domains listed here.",
    required: false,
    children: <Input placeholder="example.com" />,
  },
  argTypes: { children: { control: false } },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const WithError: Story = {
  args: { error: "Enter a domain without https://, like example.com." },
};
export const WithTextarea: Story = {
  args: { label: "Welcome message", hint: undefined, children: <Textarea /> },
};
export const Dark: Story = {
  args: { error: "Enter a domain without https://, like example.com." },
  globals: { theme: "dark" },
};
