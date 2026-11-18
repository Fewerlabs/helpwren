import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { Input } from "../base/input/input";
import { FieldList, type FieldItem } from "./field-list";

// FieldList is generic over the form's values, so the stories set its props in `render`.
const meta: Meta = {
  title: "Form/FieldList",
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const schema = z.object({
  brand: z.string().min(1, "Enter your brand name."),
  email: z.email("Enter an email address, like name@example.com."),
  domains: z.array(z.string()).min(1, "Add at least one domain."),
  audience: z.string().min(1, "Choose an audience."),
  categories: z.array(z.string()),
  monthlyBudget: z.string().min(1, "Enter a budget."),
  identity: z.enum(["guest", "unverified", "verified"]),
  welcome: z.string().max(140, "Keep it under 140 characters."),
  askForEmail: z.boolean(),
  notifications: z.boolean(),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex colour, like #3D6B57."),
});
type Settings = z.infer<typeof schema>;

const categories = [
  { value: "billing", label: "Billing" },
  { value: "bookings", label: "Bookings" },
  { value: "refunds", label: "Refunds" },
  { value: "account", label: "Account and login" },
];

const fields: FieldItem<Settings>[] = [
  { name: "brand", label: "Brand name", type: "input", required: true },
  {
    name: "email",
    label: "Support email",
    type: "input",
    required: true,
    hint: "Replies are sent from this address.",
    props: { type: "email", prepend: <Icon name="envelope" className="size-4" /> },
  },
  {
    name: "domains",
    label: "Allowed domains",
    type: "tags",
    required: true,
    className: "sm:col-span-2",
    hint: "The widget only loads on these. Press Enter after each one.",
    props: { placeholder: "example.com", transform: (text) => text.trim().toLowerCase() },
  },
  {
    name: "audience",
    label: "Default audience",
    type: "select",
    props: {
      placeholder: "Choose an audience",
      options: [
        { value: "customer", label: "Customers" },
        { value: "business", label: "Businesses" },
      ],
    },
  },
  {
    name: "monthlyBudget",
    label: "Monthly budget",
    type: "input",
    props: { currency: { decimals: 0 }, prepend: "$" },
  },
  {
    name: "categories",
    label: "Help categories",
    type: "combobox",
    className: "sm:col-span-2",
    props: { options: categories, multiple: true, placeholder: "Choose categories" },
  },
  {
    name: "identity",
    label: "Who can chat",
    type: "radio",
    className: "sm:col-span-2",
    props: {
      options: [
        { value: "guest", label: "Guests only" },
        { value: "unverified", label: "Guests and labelled users" },
        { value: "verified", label: "Guests and verified users" },
      ],
    },
  },
  {
    name: "welcome",
    label: "Welcome message",
    type: "textarea",
    className: "sm:col-span-2",
    props: { placeholder: "We'll reply here and by email." },
  },
  {
    name: "accent",
    label: "Accent colour",
    type: "custom",
    hint: "A custom control, wired with `render`.",
    render: ({ field }) => (
      <Input
        ref={field.ref}
        value={field.value}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        prepend={
          <span
            aria-hidden="true"
            className="border-line size-4 rounded-full"
            style={{ backgroundColor: field.value }}
          />
        }
      />
    ),
  },
  { name: "askForEmail", label: "Ask guests for their email before chat", type: "checkbox" },
  {
    name: "notifications",
    label: "Email me about new conversations",
    type: "switch",
    className: "sm:col-span-2",
  },
];

const defaults: Settings = {
  brand: "Acme",
  email: "",
  domains: ["acme.example"],
  audience: "",
  categories: ["billing"],
  monthlyBudget: "2500",
  identity: "unverified",
  welcome: "",
  askForEmail: true,
  notifications: false,
  accent: "#3D6B57",
};

function SettingsForm({ columns = 2 }: { columns?: 1 | 2 }) {
  const form = useForm<Settings>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [saved, setSaved] = useState<Settings | null>(null);

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(event) => {
        void form.handleSubmit(setSaved)(event);
      }}
    >
      <FieldList control={form.control} fields={fields} columns={columns} />
      <div className="flex gap-3">
        <Button type="submit">Save settings</Button>
        <Button
          variant="ghost"
          onClick={() => {
            form.reset();
            setSaved(null);
          }}
        >
          Reset
        </Button>
      </div>
      {saved ? (
        <pre className="border-line bg-card overflow-x-auto rounded-xl p-4 font-mono text-xs">
          {JSON.stringify(saved, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}

/** Press Save with the email empty to see the schema's messages on the fields. */
export const Default: Story = { render: () => <SettingsForm /> };
export const OneColumn: Story = { render: () => <SettingsForm columns={1} /> };

const contactSchema = z.object({
  method: z.enum(["email", "phone"]),
  email: z.string(),
  phone: z.string(),
});
type Contact = z.infer<typeof contactSchema>;

function ConditionalForm() {
  const form = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: { method: "email", email: "", phone: "" },
  });
  const method = useWatch({ control: form.control, name: "method" });

  return (
    <FieldList
      control={form.control}
      fields={[
        {
          name: "method",
          label: "How should we reply?",
          type: "radio",
          props: {
            options: [
              { value: "email", label: "Email" },
              { value: "phone", label: "Phone" },
            ],
          },
        },
        { name: "email", label: "Email", type: "input", hidden: method !== "email" },
        { name: "phone", label: "Phone", type: "input", hidden: method !== "phone" },
      ]}
    />
  );
}

/** `hidden` shows a field only when another value calls for it. */
export const ConditionalFields: Story = { render: () => <ConditionalForm /> };

export const Dark: Story = { render: () => <SettingsForm />, globals: { theme: "dark" } };
