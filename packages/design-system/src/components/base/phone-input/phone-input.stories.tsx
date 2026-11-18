import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../field/field";
import { PhoneInput, type PhoneDetails } from "./phone-input";

const meta = {
  title: "Base/PhoneInput",
  component: PhoneInput,
  args: { "aria-label": "Phone number", defaultCountry: "US" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Demo() {
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState<PhoneDetails | null>(null);
  const invalid = details !== null && phone !== "" && !details.isValid;

  return (
    <Field
      label="Phone number"
      hint={`Value passed to your code: "${phone}"`}
      error={invalid ? "This does not look like a complete number for that country." : undefined}
    >
      <PhoneInput
        value={phone}
        defaultCountry="GB"
        preferredCountries={["GB", "US", "NG"]}
        onValueChange={(value, next) => {
          setPhone(value);
          setDetails(next);
        }}
      />
    </Field>
  );
}

/**
 * Type a national number, or paste one with its country code, such as
 * +234 803 123 4567 or 0049 30 901820: the country switches to match.
 */
export const InAField: Story = { render: () => <Demo /> };

export const Prefilled: Story = { args: { defaultValue: "+33142685300" } };

export const LimitedCountries: Story = {
  args: { countries: ["US", "CA", "MX"], defaultCountry: "CA" },
};

export const Disabled: Story = { args: { defaultValue: "+12015550123", disabled: true } };

export const Dark: Story = {
  args: { defaultValue: "+442079460958" },
  globals: { theme: "dark" },
};
