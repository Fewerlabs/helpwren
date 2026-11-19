import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar } from "../avatar/avatar";
import { Badge } from "../badge/badge";
import { DataTable } from "./data-table";
import { RowLink } from "./row-link";

const meta: Meta = { title: "Base/Table/RowLink" };

export default meta;
type Story = StoryObj;

interface Row {
  id: number;
  name: string;
  summary: string;
}

const rows: Row[] = [
  { id: 1, name: "Visitor E71E", summary: "On the pricing page" },
  { id: 2, name: "Ada Lovelace", summary: "Wrote twice this week" },
];

/**
 * Hover a name, or reach it with Tab: it is underlined and the pointer becomes a hand, so the
 * name reads as the way into its row.
 */
export const InATable: Story = {
  render: () => (
    <DataTable
      caption="Visitors"
      rows={rows}
      getRowKey={(row) => row.id}
      columns={[
        {
          id: "name",
          header: "Name",
          rowHeader: true,
          cell: (row) => (
            <RowLink leading={<Avatar name={row.name} size="sm" className="text-2xs size-6" />}>
              {row.name}
            </RowLink>
          ),
        },
        { id: "summary", header: "Last seen", cell: (row) => row.summary },
      ]}
    />
  ),
};

/** As a link with a badge and a second line, like an article's title. */
export const AsLink: Story = {
  render: () => (
    <RowLink
      asChild
      trailing={<Badge variant="outline">Chat only</Badge>}
      description="Refunds reach the card they were paid with in five days."
    >
      <a href="https://helpwren.fewerlabs.dev">How refunds work</a>
    </RowLink>
  ),
};
