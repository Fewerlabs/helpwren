import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { Input } from "../base/input/input";
import { FieldList, type FieldItem } from "./field-list";

const schema = z.object({
  name: z.string().min(1, "Enter a name."),
  email: z.email("Enter an email address."),
  budget: z.string().min(1, "Enter a budget."),
  notes: z.string(),
  plan: z.string().min(1, "Choose a plan."),
  category: z.string().min(1, "Choose a category."),
  watchers: z.array(z.string()),
  tags: z.array(z.string()).min(1, "Add at least one tag."),
  priority: z.enum(["low", "normal", "high"]),
  terms: z.boolean().refine((value) => value, "Accept the terms."),
  notify: z.boolean(),
  code: z.string(),
  phone: z.string(),
});
type Values = z.infer<typeof schema>;

const defaults: Values = {
  name: "",
  email: "",
  budget: "",
  notes: "",
  plan: "",
  category: "",
  watchers: [],
  tags: [],
  priority: "normal",
  terms: false,
  notify: false,
  code: "",
  phone: "",
};

const categories = [
  { value: "billing", label: "Billing" },
  { value: "bookings", label: "Bookings" },
];

const fields: FieldItem<Values>[] = [
  { name: "name", label: "Name", type: "input", required: true },
  { name: "email", label: "Email", type: "input", hint: "For replies.", props: { type: "email" } },
  { name: "budget", label: "Budget", type: "input", props: { currency: true, prepend: "$" } },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "phone", label: "Phone", type: "phone", props: { defaultCountry: "GB" } },
  {
    name: "plan",
    label: "Plan",
    type: "select",
    props: {
      placeholder: "Choose",
      options: [
        { value: "free", label: "Free" },
        { value: "pro", label: "Pro" },
      ],
    },
  },
  { name: "category", label: "Category", type: "combobox", props: { options: categories } },
  {
    name: "watchers",
    label: "Watchers",
    type: "combobox",
    props: { options: categories, multiple: true },
  },
  { name: "tags", label: "Tags", type: "tags" },
  {
    name: "priority",
    label: "Priority",
    type: "radio",
    props: {
      options: [
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
      ],
    },
  },
  { name: "terms", label: "I accept the terms", type: "checkbox" },
  { name: "notify", label: "Email me updates", type: "switch" },
  {
    name: "code",
    label: "Promo code",
    type: "custom",
    render: ({ field }) => (
      <Input
        ref={field.ref}
        value={field.value}
        onValueChange={(value) => {
          field.onChange(value.toUpperCase());
        }}
        onBlur={field.onBlur}
      />
    ),
  },
];

function Form({
  onSubmit,
  values = defaults,
  only,
  disabled = false,
}: {
  onSubmit: (values: Values) => void;
  values?: Values;
  only?: readonly FieldItem<Values>[];
  disabled?: boolean;
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: values });
  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
    >
      <FieldList control={form.control} fields={only ?? fields} disabled={disabled} />
      <button type="submit">Save</button>
    </form>
  );
}

const filled: Values = {
  ...defaults,
  name: "Ada",
  email: "ada@example.com",
  budget: "1000",
  plan: "pro",
  category: "billing",
  tags: ["vip"],
  terms: true,
};

describe("FieldList", () => {
  it("renders a labelled control for every field, by type", () => {
    render(<Form onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAccessibleDescription(
      "For replies.",
    );
    expect(screen.getByRole("textbox", { name: "Notes" }).tagName).toBe("TEXTAREA");
    expect(screen.getByRole("combobox", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Watchers" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "I accept the terms" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Email me updates" })).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: "Promo code" })).toBeInTheDocument();
  });

  it("shows the schema's messages on the fields that fail, and does not submit", async () => {
    const onSubmit = vi.fn();
    render(<Form onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const name = await screen.findByRole("textbox", { name: "Name" });
    expect(name).toBeInvalid();
    expect(name).toHaveAccessibleDescription("Enter a name.");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAccessibleDescription(
      "Enter an email address.",
    );
    expect(screen.getByRole("combobox", { name: "Plan" })).toBeInvalid();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInvalid();
    expect(screen.getByRole("textbox", { name: "Tags" })).toHaveAccessibleDescription(
      "Add at least one tag.",
    );
    expect(
      screen.getByRole("checkbox", { name: "I accept the terms" }),
    ).toHaveAccessibleDescription("Accept the terms.");
    expect(screen.getByRole("textbox", { name: "Notes" })).not.toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values people enter, in the shape of the schema", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Form onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.type(screen.getByRole("textbox", { name: "Budget" }), "12500");
    expect(screen.getByRole("textbox", { name: "Budget" })).toHaveValue("12,500");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "Call first");
    await user.type(screen.getByRole("textbox", { name: "Phone" }), "02079460958");

    await user.click(screen.getByRole("combobox", { name: "Plan" }));
    await user.click(await screen.findByRole("option", { name: "Pro" }));

    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Bookings" }));

    await user.click(screen.getByRole("combobox", { name: "Watchers" }));
    await user.click(screen.getByRole("option", { name: "Billing" }));
    await user.keyboard("{Escape}");

    await user.type(screen.getByRole("textbox", { name: "Tags" }), "vip{Enter}");
    await user.click(screen.getByRole("radio", { name: "High" }));
    await user.click(screen.getByRole("checkbox", { name: "I accept the terms" }));
    await user.click(screen.getByRole("switch", { name: "Email me updates" }));
    await user.type(screen.getByRole("textbox", { name: "Promo code" }), "wren");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: "Ada",
      email: "ada@example.com",
      budget: "12500",
      notes: "Call first",
      plan: "pro",
      category: "bookings",
      watchers: ["billing"],
      tags: ["vip"],
      priority: "high",
      terms: true,
      notify: true,
      code: "WREN",
      phone: "+442079460958",
    });
  });

  it("shows the form's default values", () => {
    render(
      <Form onSubmit={vi.fn()} values={{ ...filled, watchers: ["bookings"], notify: true }} />,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ada");
    expect(screen.getByRole("textbox", { name: "Budget" })).toHaveValue("1,000");
    expect(screen.getByRole("combobox", { name: "Plan" })).toHaveTextContent("Pro");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("Billing");
    expect(screen.getByRole("button", { name: "Remove Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove vip" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "I accept the terms" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Email me updates" })).toBeChecked();
  });

  it("clears a field's error once the value is valid again", async () => {
    render(<Form onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const name = await screen.findByRole("textbox", { name: "Name" });
    expect(name).toBeInvalid();

    await userEvent.type(name, "Ada");

    await vi.waitFor(() => {
      expect(name).not.toBeInvalid();
    });
  });

  it("leaves out hidden fields and disables every field when asked", () => {
    render(
      <Form
        onSubmit={vi.fn()}
        disabled
        only={[
          { name: "name", label: "Name", type: "input" },
          { name: "notes", label: "Notes", type: "textarea", hidden: true },
          { name: "notify", label: "Email me updates", type: "switch" },
        ]}
      />,
    );
    expect(screen.queryByRole("textbox", { name: "Notes" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Email me updates" })).toBeDisabled();
  });
});
