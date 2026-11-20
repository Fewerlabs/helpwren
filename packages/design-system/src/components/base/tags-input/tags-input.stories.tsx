import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Field } from "../field/field";
import { Icon } from "../icon/icon";
import { StatusChip } from "../status-chip/status-chip";
import { TagsInput } from "./tags-input";

const meta = {
  title: "Base/TagsInput",
  component: TagsInput,
  args: { "aria-label": "Tags", placeholder: "Add a tag" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TagsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValues: Story = {
  args: { defaultValue: ["billing", "refunds", "ios", "onboarding", "cancellations"] },
};

/** Values already in use are offered as the text is typed; anything else can still be typed. */
export const WithSuggestions: Story = {
  args: {
    defaultValue: ["refunds"],
    suggestions: ["billing", "bookings", "cancellations", "payouts", "refunds", "ios"],
  },
};

function Domains() {
  const [domains, setDomains] = useState(["acme.example", "app.acme.example"]);
  return (
    <Field
      label="Allowed domains"
      hint="Press Enter or comma after each one. Pasting a list adds them all."
      error={domains.length === 0 ? "Add at least one domain." : undefined}
    >
      <TagsInput
        value={domains}
        onValueChange={setDomains}
        placeholder="example.com"
        prepend={<Icon name="globe" className="size-4" />}
        transform={(text) => text.trim().toLowerCase()}
        validate={(domain) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)}
      />
    </Field>
  );
}

/** `transform` cleans each value and `validate` rejects the ones that do not fit. */
export const InAField: Story = { render: () => <Domains /> };

export const CustomTags: Story = {
  args: {
    defaultValue: ["urgent", "waiting"],
    renderTag: ({ value, remove }) => (
      <button type="button" onClick={remove} aria-label={`Remove ${value}`}>
        <StatusChip status={value === "urgent" ? "urgent" : "waiting"} size="sm">
          {value}
        </StatusChip>
      </button>
    ),
  },
};

export const Limited: Story = { args: { defaultValue: ["one", "two"], max: 2 } };
export const Disabled: Story = { args: { defaultValue: ["billing", "ios"], disabled: true } };
export const Dark: Story = {
  args: { defaultValue: ["billing", "refunds", "ios"] },
  globals: { theme: "dark" },
};
