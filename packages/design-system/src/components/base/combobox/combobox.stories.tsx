import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { Field } from "../field/field";
import { Icon } from "../icon/icon";
import { Combobox, type ComboboxOption } from "./combobox";
import type { ComboboxLoader } from "./use-async-options";
import type { ComboboxResolver } from "./use-resolved-options";

// Combobox is generic, so the stories set its props in `render` instead of through `args`.
const meta: Meta = {
  title: "Base/Combobox",
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const categories: ComboboxOption[] = [
  { value: "billing", label: "Billing" },
  { value: "bookings", label: "Bookings" },
  { value: "refunds", label: "Refunds" },
  { value: "account", label: "Account and login" },
  { value: "payouts", label: "Payouts", disabled: true },
  { value: "mobile", label: "Mobile apps" },
];

export const Default: Story = {
  render: () => (
    <Field label="Category">
      <Combobox options={categories} placeholder="Choose a category" clearable />
    </Field>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Field label="Categories" hint="The box grows as you add more.">
      <Combobox
        multiple
        options={categories}
        defaultValue={["billing", "refunds"]}
        placeholder="Choose categories"
      />
    </Field>
  ),
};

interface Person {
  id: number;
  name: string;
  email: string;
}

const people: Person[] = Array.from({ length: 137 }, (_, index) => {
  const first = ["Ada", "Grace", "Alan", "Katherine", "Linus", "Margaret", "Dennis", "Barbara"];
  const last = ["Lovelace", "Hopper", "Turing", "Johnson", "Torvalds", "Hamilton", "Ritchie"];
  const name = `${first[index % first.length] ?? ""} ${last[index % last.length] ?? ""} ${index + 1}`;
  return { id: index + 1, name, email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com` };
});

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

const PAGE_SIZE = 20;

/** Stands in for a server endpoint such as GET /contacts?search=&page=. */
const loadPeople: ComboboxLoader<Person, number> = async ({ search, cursor = 0, signal }) => {
  await wait(500, signal);
  const matches = people.filter((person) =>
    person.name.toLowerCase().includes(search.toLowerCase()),
  );
  const next = cursor + PAGE_SIZE;
  return {
    options: matches.slice(cursor, next),
    nextCursor: next < matches.length ? next : undefined,
  };
};

/** Stands in for a server endpoint such as GET /contacts?ids=1,2,3. */
const resolvePeople: ComboboxResolver<Person, number> = async (ids, signal) => {
  await wait(700, signal);
  return people.filter((person) => ids.includes(person.id));
};

const personProps = {
  getOptionValue: (person: Person) => person.id,
  getOptionLabel: (person: Person) => person.name,
};

/** Search runs on the server and more results load as you scroll to the end of the list. */
export const ServerSearchAndInfiniteScroll: Story = {
  render: () => (
    <Field label="Assignee" hint="137 people, loaded 20 at a time.">
      <Combobox<Person, number, number>
        {...personProps}
        loadOptions={loadPeople}
        placeholder="Search people"
        clearable
      />
    </Field>
  ),
};

function Prefilled() {
  // Person 120 is on page 6, so the first page of results does not contain them.
  const [assignee, setAssignee] = useState<number | null>(120);
  return (
    <Field label="Assignee" hint={`Form value: ${assignee ?? "none"}`}>
      <Combobox<Person, number, number>
        {...personProps}
        loadOptions={loadPeople}
        resolveOptions={resolvePeople}
        value={assignee}
        onValueChange={setAssignee}
        clearable
      />
    </Field>
  );
}

/**
 * A form prefilled with an id whose option is not in the first page. The box asks
 * `resolveOptions` for it and shows the name as soon as it arrives.
 */
export const PrefilledFromServer: Story = { render: () => <Prefilled /> };

export const PrefilledMultiple: Story = {
  render: () => (
    <Field label="Watchers">
      <Combobox<Person, number, number>
        {...personProps}
        multiple
        loadOptions={loadPeople}
        resolveOptions={resolvePeople}
        defaultValue={[3, 77, 120]}
        placeholder="Add watchers"
      />
    </Field>
  ),
};

/** `renderOption`, `renderValue`, `prepend` and `footer` replace each visible part. */
export const Customised: Story = {
  render: () => (
    <Field label="Contact">
      <Combobox<Person, number, number>
        {...personProps}
        loadOptions={loadPeople}
        placeholder="Find a contact"
        prepend={<Icon name="user" className="size-4" />}
        messages={{ empty: "Nobody matches that search." }}
        renderValue={(person) => (
          <span className="flex items-center gap-2">
            <Avatar name={person.name} size="sm" className="size-5 text-[0.5rem]" />
            {person.name}
          </span>
        )}
        renderOption={(person, { selected }) => (
          <>
            <Avatar name={person.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{person.name}</span>
              <span className="text-muted-foreground block truncate text-xs">{person.email}</span>
            </span>
            {selected ? <Icon name="check" className="size-4" /> : null}
          </>
        )}
        footer={
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Icon name="plus" />
            New contact
          </Button>
        }
      />
    </Field>
  ),
};

const failing: ComboboxLoader<Person, number> = async ({ signal }) => {
  await wait(300, signal);
  throw new Error("Network error");
};

export const LoadError: Story = {
  render: () => (
    <Combobox<Person, number, number>
      {...personProps}
      aria-label="Assignee"
      loadOptions={failing}
      placeholder="Open to see the error state"
    />
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field label="Category" error="Choose a category.">
      <Combobox options={categories} placeholder="Choose a category" />
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field label="Category">
      <Combobox options={categories} defaultValue="billing" disabled />
    </Field>
  ),
};

export const Dark: Story = {
  render: () => (
    <Field label="Categories">
      <Combobox multiple options={categories} defaultValue={["billing", "refunds"]} />
    </Field>
  ),
  globals: { theme: "dark" },
};
