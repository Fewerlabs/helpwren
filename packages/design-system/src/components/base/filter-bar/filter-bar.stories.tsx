import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { FilterBar, type FilterDefinition, type FilterValue } from "./filter-bar";

const meta: Meta = { title: "Base/FilterBar" };
export default meta;
type Story = StoryObj;

const filters: FilterDefinition[] = [
  {
    id: "status",
    label: "Status",
    icon: "check-circle",
    options: [
      { value: "open", label: "Open" },
      { value: "waiting", label: "Waiting" },
      { value: "resolved", label: "Resolved" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    icon: "warning-circle",
    options: [
      { value: "low", label: "Low" },
      { value: "normal", label: "Normal" },
      { value: "high", label: "High" },
    ],
  },
  {
    id: "assignee",
    label: "Assignee",
    icon: "user",
    options: [
      { value: "ada", label: "Ada Okafor" },
      { value: "sam", label: "Sam Rivera" },
    ],
  },
];

function Bar({ initial }: { initial: FilterValue }) {
  const [value, setValue] = useState(initial);
  return <FilterBar filters={filters} value={value} onValueChange={setValue} />;
}

/** With nothing set, there is only the button that adds a filter. */
export const Empty: Story = { render: () => <Bar initial={{}} /> };

/** Each filter in use is a chip: what it filters, and what it is set to. */
export const InUse: Story = {
  render: () => <Bar initial={{ status: ["open", "waiting"], priority: ["high"] }} />,
};
