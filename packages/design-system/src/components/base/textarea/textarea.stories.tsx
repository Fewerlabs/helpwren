import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "../field/field";
import { Textarea } from "./textarea";

const meta = {
  title: "Base/Textarea",
  component: Textarea,
  args: { placeholder: "Write a reply", "aria-label": "Reply" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="grid max-w-sm gap-5">
      <Field label="Reply">
        <Textarea placeholder="Write a reply" />
      </Field>
      <Field label="Internal note" error="A note cannot be empty.">
        <Textarea />
      </Field>
      <Field label="Canned reply">
        <Textarea defaultValue="We'll reply here and by email." disabled />
      </Field>
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
