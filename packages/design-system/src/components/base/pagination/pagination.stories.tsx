import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Pagination, type PaginationNoun } from "./pagination";

const meta = {
  title: "Base/Pagination",
  component: Pagination,
  args: {
    noun: { one: "contact", other: "contacts" },
    pagination: {
      page: 1,
      pageSize: 25,
      total: 4,
      itemCount: 4,
      hasPrevious: false,
      hasNext: false,
      setPage: () => undefined,
    },
  },
  decorators: [
    (Story) => (
      <div className="border-rule bg-card max-w-2xl rounded-xl border">
        <div className="text-muted-foreground p-6 text-sm">Table rows</div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const contacts: PaginationNoun = { one: "contact", other: "contacts" };

/** Clicking through a list of 132 contacts, 25 at a time. */
function Paged({ total, pageSize }: { total: number; pageSize: number }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Pagination
      noun={contacts}
      pagination={{
        page,
        pageSize,
        total,
        itemCount: Math.min(pageSize, total - (page - 1) * pageSize),
        hasPrevious: page > 1,
        hasNext: page < pageCount,
        setPage,
      }}
    />
  );
}

export const ManyPages: Story = {
  render: () => <Paged total={132} pageSize={25} />,
};

/** Still shown with one page, so the count is always there. */
export const OnePage: Story = {};

/** At 375px the summary and the buttons still share one line. */
export const Phone: Story = {
  ...ManyPages,
  decorators: [
    (Story) => (
      <div className="max-w-[375px]">
        <Story />
      </div>
    ),
  ],
};
