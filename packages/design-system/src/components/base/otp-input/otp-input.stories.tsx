import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../field/field";
import { OtpInput } from "./otp-input";

const meta: Meta = { title: "Base/OtpInput" };
export default meta;
type Story = StoryObj;

function Example({ error }: { error?: string }) {
  const [value, setValue] = useState("");
  return (
    <Field label="Sign-in code" hint="The six digits we emailed you." error={error}>
      <OtpInput value={value} onValueChange={setValue} />
    </Field>
  );
}

/** Type, or paste the whole code. Each digit lands in its own box. */
export const Default: Story = { render: () => <Example /> };

export const WithError: Story = {
  render: () => <Example error="That code is wrong or out of date." />,
};
