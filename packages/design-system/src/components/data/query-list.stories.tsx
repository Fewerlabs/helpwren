import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar } from "../base/avatar/avatar";
import { Button } from "../base/button/button";
import { StatusChip } from "../base/status-chip/status-chip";
import { QueryList, type QueryListPage, type QueryListRequest } from "./query-list";
import { QueryProvider } from "./test-utils";

// QueryList is generic, so the stories set its props in `render` instead of through `args`.
const meta: Meta = {
  title: "Data/QueryList",
  decorators: [
    (Story) => (
      <QueryProvider>
        <div className="max-w-md">
          <Story />
        </div>
      </QueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

interface Conversation {
  id: number;
  contact: string;
  preview: string;
  status: "open" | "waiting" | "resolved";
}

const statuses = ["open", "waiting", "resolved"] as const;
const conversations: Conversation[] = Array.from({ length: 64 }, (_, index) => ({
  id: index + 1,
  contact: ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson"][index % 4] ?? "",
  preview: `Conversation ${index + 1}: I was charged twice for my booking.`,
  status: statuses[index % 3] ?? "open",
}));

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** Stands in for a server endpoint such as GET /conversations?page=&pageSize=. */
async function fetchConversations({
  page,
  pageSize = 8,
  signal,
}: QueryListRequest<number>): Promise<QueryListPage<Conversation, number>> {
  await wait(600, signal);
  const start = (page - 1) * pageSize;
  return {
    items: conversations.slice(start, start + pageSize),
    nextCursor: start + pageSize < conversations.length ? start + pageSize : undefined,
    total: conversations.length,
  };
}

function Row({ conversation }: { conversation: Conversation }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar name={conversation.contact} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{conversation.contact}</p>
        <p className="text-muted-foreground truncate text-sm">{conversation.preview}</p>
      </div>
      <StatusChip status={conversation.status} size="sm" />
    </div>
  );
}

const list = {
  "aria-label": "Conversations",
  renderItem: (conversation: Conversation) => <Row conversation={conversation} />,
  getItemKey: (conversation: Conversation) => conversation.id,
  listClassName: "divide-rule divide-y",
};

/**
 * Waits for the first page, so the accessibility check sees the list scrolling in its box and
 * not the loading state that comes before it.
 */
const waitForList: Story["play"] = async ({ canvas }) => {
  await canvas.findByRole("list", { name: "Conversations" });
};

/** The next page loads when the end of the list scrolls into view. */
export const InfiniteScroll: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "infinite"]}
      queryFn={fetchConversations}
      // The list is its own scrolling box, so the progress bar stays pinned to its top edge.
      className="border-line bg-card h-96 overflow-y-auto rounded-xl"
      contentClassName="px-4"
      {...list}
    />
  ),
  play: waitForList,
};

/**
 * A short list, so the end is easy to reach: a spinner shows at the bottom while
 * the next page loads, and the wren marks the end once there is nothing more.
 */
export const EndOfList: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "end"]}
      queryFn={async (request: QueryListRequest<number>) => {
        const page = await fetchConversations({ ...request, pageSize: 6 });
        const loaded = request.page * 6;
        return loaded >= 18 ? { ...page, nextCursor: undefined } : page;
      }}
      className="border-line bg-card h-96 overflow-y-auto rounded-xl"
      contentClassName="px-4"
      {...list}
    />
  ),
  play: waitForList,
};

export const LoadMoreButton: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "button"]}
      queryFn={fetchConversations}
      pageSize={4}
      loadMoreOn="button"
      {...list}
    />
  ),
};

/**
 * One page at a time. The current page stays on screen, under a progress bar,
 * until the next one arrives. Pages already visited come from the cache.
 */
export const Pages: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "pages"]}
      queryFn={fetchConversations}
      pagination="pages"
      pageSize={5}
      noun={{ one: "conversation", other: "conversations" }}
      staleTime={60_000}
      {...list}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <QueryList<Conversation>
      queryKey={["stories", "empty"]}
      queryFn={() => Promise.resolve({ items: [] })}
      messages={{
        empty: "All caught up.",
        emptyDescription: "New conversations appear here as they arrive.",
      }}
      {...list}
    />
  ),
};

export const ErrorWithRetry: Story = {
  render: () => (
    <QueryList<Conversation>
      queryKey={["stories", "error"]}
      queryFn={async ({ signal }) => {
        await wait(400, signal);
        throw new Error("Network error");
      }}
      {...list}
    />
  ),
};

/** Every state can be replaced, and `header` and `footer` wrap the items. */
export const Customised: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "custom"]}
      queryFn={fetchConversations}
      pagination="pages"
      pageSize={3}
      header={<p className="text-muted-foreground text-2xs font-mono uppercase">#open · 64</p>}
      renderLoading={() => <p className="text-muted-foreground py-6 text-sm">Fetching…</p>}
      renderPagination={({ page, pageCount, hasNext, hasPrevious, setPage }) => (
        <div className="flex items-center justify-end gap-2 pt-3">
          <span className="text-muted-foreground mr-auto font-mono text-xs">
            {page} / {pageCount ?? "?"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasPrevious}
            onClick={() => {
              setPage(1);
            }}
          >
            First
          </Button>
          <Button
            size="sm"
            disabled={!hasNext}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next page
          </Button>
        </div>
      )}
      {...list}
    />
  ),
};

/** With `children` as a function the component only supplies state; the markup is yours. */
export const Headless: Story = {
  render: () => (
    <QueryList<Conversation, number>
      queryKey={["stories", "headless"]}
      queryFn={fetchConversations}
      pageSize={6}
    >
      {({ status, items, total, hasMore, loadMore, isFetchingMore }) => (
        <div className="grid gap-3">
          <p className="text-sm">
            {status === "loading" ? "Loading" : `${items.length} of ${total ?? 0} loaded`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((conversation) => (
              <div key={conversation.id} className="border-line bg-card rounded-xl p-3 text-sm">
                {conversation.contact}
              </div>
            ))}
          </div>
          {hasMore ? (
            <Button variant="secondary" size="sm" onClick={loadMore} loading={isFetchingMore}>
              Show more
            </Button>
          ) : null}
        </div>
      )}
    </QueryList>
  ),
};

export const Dark: Story = {
  render: () => (
    <QueryList
      queryKey={["stories", "dark"]}
      queryFn={fetchConversations}
      pagination="pages"
      pageSize={4}
      {...list}
    />
  ),
  globals: { theme: "dark" },
};
