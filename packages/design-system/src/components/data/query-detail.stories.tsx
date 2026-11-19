import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar } from "../base/avatar/avatar";
import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { QueryDetail } from "./query-detail";
import { QueryProvider } from "./test-utils";

// QueryDetail is generic, so the stories set its props in `render` instead of through `args`.
/** The card is the component itself: the box on `className`, the padding on `contentClassName`. */
const card = {
  className: "border-line bg-card overflow-clip rounded-xl",
  contentClassName: "p-4",
};

const meta: Meta = {
  title: "Data/QueryDetail",
  decorators: [
    (Story) => (
      <QueryProvider>
        <div className="max-w-sm">
          <Story />
        </div>
      </QueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

interface Contact {
  name: string;
  email: string;
  conversations: number;
  loadedAt: string;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** Stands in for a server endpoint such as GET /contacts/1. */
async function fetchContact({ signal }: { signal: AbortSignal }): Promise<Contact> {
  await wait(700, signal);
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    conversations: 3,
    loadedAt: new Date().toLocaleTimeString(),
  };
}

/** Press Refresh: the contact stays on screen under a progress bar while it reloads. */
export const Default: Story = {
  render: () => (
    <QueryDetail<Contact> {...card} queryKey={["stories", "contact"]} queryFn={fetchContact}>
      {(contact, { refetch, isFetching }) => (
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={contact.name} size="lg" />
            <div>
              <p className="font-medium">{contact.name}</p>
              <p className="text-muted-foreground text-sm">{contact.email}</p>
            </div>
          </div>
          <p className="text-sm">{contact.conversations} past conversations</p>
          <p className="text-muted-foreground font-mono text-xs">Loaded at {contact.loadedAt}</p>
          <Button variant="secondary" size="sm" onClick={refetch} disabled={isFetching}>
            <Icon name="clock" />
            Refresh
          </Button>
        </div>
      )}
    </QueryDetail>
  ),
};

export const NotFound: Story = {
  render: () => (
    <QueryDetail<Contact>
      {...card}
      queryKey={["stories", "missing"]}
      queryFn={() => Promise.resolve(null)}
      messages={{
        notFound: "This contact no longer exists.",
        notFoundDescription: "They may have been merged into another contact.",
      }}
    >
      {(contact) => <p>{contact.name}</p>}
    </QueryDetail>
  ),
};

export const ErrorWithRetry: Story = {
  render: () => (
    <QueryDetail<Contact>
      {...card}
      queryKey={["stories", "contact-error"]}
      queryFn={async ({ signal }) => {
        await wait(400, signal);
        throw new Error("Network error");
      }}
    >
      {(contact) => <p>{contact.name}</p>}
    </QueryDetail>
  ),
};

/** The first load: a record panel's shape, a name beside an avatar and sections of facts. */
export const Skeleton: Story = {
  render: () => (
    <QueryDetail<Contact>
      className="border-line bg-card overflow-clip rounded-xl"
      queryKey={["stories", "contact-loading"]}
      queryFn={() => new Promise(() => undefined)}
    >
      {(contact) => <p>{contact.name}</p>}
    </QueryDetail>
  ),
};

/** A view of another shape, such as an editor, opens with the loader instead. */
export const Loader: Story = {
  render: () => (
    <QueryDetail<Contact>
      {...card}
      placeholder="loader"
      queryKey={["stories", "contact-loader"]}
      queryFn={() => new Promise(() => undefined)}
    >
      {(contact) => <p>{contact.name}</p>}
    </QueryDetail>
  ),
};

/** Not found, with a way out of the panel. */
export const NotFoundWithClose: Story = {
  render: () => (
    <QueryDetail<Contact>
      {...card}
      queryKey={["stories", "missing-close"]}
      queryFn={() => Promise.resolve(null)}
      messages={{
        notFound: "This contact could not be found.",
        notFoundDescription: "They may have been merged into another contact.",
      }}
      notFoundAction={
        <Button variant="secondary" size="sm">
          Close
        </Button>
      }
    >
      {(contact) => <p>{contact.name}</p>}
    </QueryDetail>
  ),
};

export const CustomStates: Story = {
  render: () => (
    <QueryDetail<Contact>
      {...card}
      queryKey={["stories", "contact-custom"]}
      queryFn={fetchContact}
      renderLoading={() => <p className="text-muted-foreground text-sm">Finding this contact…</p>}
    >
      {(contact) => <p className="font-medium">{contact.name}</p>}
    </QueryDetail>
  ),
};

export const Dark: Story = {
  render: () => (
    <QueryDetail<Contact> {...card} queryKey={["stories", "contact-dark"]} queryFn={fetchContact}>
      {(contact) => (
        <div className="flex items-center gap-3">
          <Avatar name={contact.name} />
          <p className="font-medium">{contact.name}</p>
        </div>
      )}
    </QueryDetail>
  ),
  globals: { theme: "dark" },
};
