import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Pagination, type PaginationNoun, type PaginationProps } from "./pagination";

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

/**
 * Clicking through a list of 132 contacts, 25 at a time, with the rows-per-page picker. A new
 * size goes back to the first page, as `QueryList` does.
 */
function Paged({
  total,
  ...props
}: { total: number } & Pick<
  PaginationProps,
  "mode" | "pageSizeOptions" | "showSummary" | "showControls"
>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // In load-more mode the pages so far stay on screen, so the count grows.
  const [loaded, setLoaded] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const loadMore = props.mode === "load-more";
  const last = loadMore ? loaded : page;
  return (
    <Pagination
      {...props}
      noun={contacts}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
        setLoaded(1);
      }}
      onLoadMore={() => {
        setLoaded(loaded + 1);
      }}
      pagination={{
        page: loadMore ? 1 : page,
        pageSize,
        total,
        itemCount: loadMore
          ? Math.min(total, loaded * pageSize)
          : Math.min(pageSize, total - (page - 1) * pageSize),
        hasPrevious: !loadMore && page > 1,
        hasNext: last < pageCount,
        setPage,
      }}
    />
  );
}

export const ManyPages: Story = {
  render: () => <Paged total={132} />,
};

/** Still shown with one page, so the count is always there. */
export const OnePage: Story = {};

/** A phone adds the next page under the rows instead: "Showing 50 of 132". */
export const LoadMore: Story = {
  render: () => <Paged total={132} mode="load-more" />,
};

/** `pageSizeOptions={false}` leaves out the picker; `showSummary={false}` the count. */
export const WithoutPickerOrSummary: Story = {
  render: () => <Paged total={132} pageSizeOptions={false} showSummary={false} />,
};

/** Only the count, with `showControls={false}` and no picker. */
export const SummaryOnly: Story = {
  render: () => <Paged total={132} pageSizeOptions={false} showControls={false} />,
};

/** At 375px the summary, the picker (a number alone) and the buttons still share one line. */
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
