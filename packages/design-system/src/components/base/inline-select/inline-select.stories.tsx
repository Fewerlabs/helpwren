import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Avatar } from "../avatar/avatar";
import { StatusChip } from "../status-chip/status-chip";
import { InlineSelect } from "./inline-select";

const meta: Meta = { title: "Base/InlineSelect" };
export default meta;
type Story = StoryObj;

const people = ["Ada Okafor", "Sam Rivera", "Kofi Mensah", "Mei Tanaka"].map((name) => ({
  value: name,
  label: name,
  content: (
    <>
      <Avatar name={name} size="sm" className="size-5 text-[0.5625rem]" />
      {name}
    </>
  ),
}));

function Assignee() {
  const [value, setValue] = useState("Ada Okafor");
  return (
    <InlineSelect label="Assignee" value={value} options={people} onValueChange={setValue}>
      <Avatar name={value} size="sm" className="size-5 text-[0.5625rem]" />
      {value}
    </InlineSelect>
  );
}

/** The value shows as itself. Pressing it opens the list. */
export const WithAvatar: Story = { render: () => <Assignee /> };

const statuses = [
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
] as const;

function Status() {
  const [value, setValue] = useState<(typeof statuses)[number]["value"]>("open");
  return (
    <InlineSelect
      label="Status"
      value={value}
      options={statuses.map((status) => ({
        ...status,
        content: <StatusChip status={status.value} size="sm" />,
      }))}
      onValueChange={(next) => {
        setValue(next as typeof value);
      }}
    >
      <StatusChip status={value} size="sm" />
    </InlineSelect>
  );
}

export const WithChip: Story = { render: () => <Status /> };

function Country() {
  const countries = [
    "Brazil",
    "Canada",
    "Ghana",
    "India",
    "Japan",
    "Kenya",
    "Mexico",
    "Nigeria",
    "Spain",
  ];
  const [value, setValue] = useState("Nigeria");
  return (
    <InlineSelect
      label="Country"
      value={value}
      options={countries.map((country) => ({ value: country, label: country }))}
      onValueChange={setValue}
    >
      {value}
    </InlineSelect>
  );
}

/** With more than seven options, the list can be searched. */
export const Searchable: Story = { render: () => <Country /> };
