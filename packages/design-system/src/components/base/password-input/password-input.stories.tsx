import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "../field/field";
import { PasswordInput } from "./password-input";

const meta: Meta = { title: "Base/PasswordInput" };
export default meta;
type Story = StoryObj;

/** Hidden as it is typed. The eye shows it, to check it before signing in. */
export const Default: Story = {
  render: () => (
    <Field label="Password">
      <PasswordInput />
    </Field>
  ),
};

/** Where someone chooses one, so a password manager offers to save it. */
export const NewPassword: Story = {
  render: () => (
    <Field label="New password" hint="At least 8 characters.">
      <PasswordInput autoComplete="new-password" />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field label="Password" error="That email and password do not match.">
      <PasswordInput defaultValue="wrong-one" />
    </Field>
  ),
};
