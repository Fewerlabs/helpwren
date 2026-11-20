import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../field/field";
import { KeyValueInput, type KeyValuePair } from "./key-value-input";

function CustomFields() {
  const [fields, setFields] = useState<KeyValuePair[]>([
    { key: "plan", value: "pro" },
    { key: "feature", value: "calendar" },
  ]);
  return (
    <Field label="Custom fields" hint="Any name and value, for picking this article out.">
      <KeyValueInput
        value={fields}
        onValueChange={setFields}
        keyPlaceholder="plan"
        valuePlaceholder="pro"
        transformKey={(key) => key.toLowerCase().replace(/[^a-z0-9_]/g, "_")}
        max={20}
      />
    </Field>
  );
}

const meta = {
  title: "Base/KeyValueInput",
  component: CustomFields,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CustomFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Names and values edited in place, as an article's custom fields are. */
export const Default: Story = {};
