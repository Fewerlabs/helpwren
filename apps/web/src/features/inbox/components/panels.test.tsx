import { type ConversationWithContact, type HelpwrenClient } from "@helpwren/core";
import { ConfirmProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { contactName } from "../contact-name";
import { inboxStatuses, inboxViews } from "../hooks/use-inbox";
import { DetailsPanel } from "./details-panel";
import { ListPanel, type ListPanelProps } from "./list-panel";

function conversation(overrides: Partial<ConversationWithContact> = {}): ConversationWithContact {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    status: "open",
    type: "chat",
    ticketNumber: null,
    subject: null,
    priority: "normal",
    source: "web",
    context: {},
    assigneeId: null,
    teamId: null,
    lastMessagePreview: "Do you ship abroad?",
    lastMessageAt: new Date().toISOString(),
    unreadForContact: 0,
    unreadForAgents: 2,
    createdAt: "2026-11-18T10:00:00Z",
    contact: {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "guest",
      verified: false,
      name: "Priya Nair",
      email: "priya@example.org",
      phone: null,
    },
    ...overrides,
  };
}

interface Fake {
  /** What listing the view's conversations gives, or an error to fail with. */
  list?: ConversationWithContact[] | Error;
}

function fakeClient({ list = [conversation()] }: Fake = {}) {
  return {
    // The details panel loads the conversation's rating; here there is none.
    ratings: { get: () => Promise.resolve(null) },
    conversations: {
      list: vi.fn(() =>
        list instanceof Error
          ? Promise.reject(list)
          : Promise.resolve({ items: list, nextCursor: undefined }),
      ),
      search: vi.fn(() => Promise.resolve([conversation({ lastMessagePreview: "Found it" })])),
    },
  };
}

function withClient(ui: ReactElement, client = fakeClient()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <HelpwrenProvider getClient={() => client as unknown as HelpwrenClient}>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </HelpwrenProvider>
    </QueryClientProvider>
  );
}

const everyone = inboxViews[2];
const [open, , , anyStatus] = inboxStatuses;

function renderList(props: Partial<ListPanelProps> = {}, fake: Fake = {}) {
  const onSelect = vi.fn();
  const onStatusChange = vi.fn();
  const client = fakeClient(fake);
  render(
    withClient(
      <ListPanel
        view={everyone}
        agentId="33333333-3333-4333-8333-333333333333"
        team={[]}
        count={1}
        status={open}
        onStatusChange={onStatusChange}
        search=""
        onSearchChange={vi.fn()}
        searchText=""
        selectedId={null}
        onSelect={onSelect}
        {...props}
      />,
      client,
    ),
  );
  return { onSelect, onStatusChange, client };
}

describe("contactName", () => {
  const { contact } = conversation();

  it("falls back from name to email to phone to Guest", () => {
    expect(contactName(contact)).toBe("Priya Nair");
    expect(contactName({ ...contact, name: null })).toBe("priya@example.org");
    expect(contactName({ ...contact, name: null, email: null, phone: "+2348012345678" })).toBe(
      "+2348012345678",
    );
    expect(contactName({ ...contact, name: null, email: null })).toBe("Guest");
  });
});

describe("ListPanel", () => {
  it("lists conversations with who, the latest message and the unread count", async () => {
    const { onSelect, client } = renderList();
    const list = await screen.findByRole("list", { name: "Conversations" });
    const row = within(list).getByRole("button");

    expect(client.conversations.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: ["open"] }),
    );
    expect(row).toHaveTextContent("Priya Nair");
    expect(row).toHaveTextContent("Do you ship abroad?");
    expect(row).toHaveTextContent("2 unread");

    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: conversation().id }));
  });

  it("is titled with the view it shows and how much it holds, and marks the open conversation", async () => {
    renderList({ selectedId: conversation().id });
    expect(screen.getByRole("heading", { name: /^All\s*1$/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { current: true })).toHaveTextContent("Priya Nair");
  });

  it("shows each conversation's status only when every status is listed", async () => {
    const { client } = renderList(
      { status: anyStatus },
      { list: [conversation({ status: "resolved", unreadForAgents: 0 })] },
    );
    expect(await screen.findByText("Resolved")).toBeInTheDocument();
    expect(client.conversations.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it("switches which statuses it shows from the top of the list", async () => {
    const { onStatusChange } = renderList();
    await userEvent.click(screen.getByRole("button", { name: /^Show:/ }));
    await userEvent.click(screen.getByRole("option", { name: "Waiting" }));
    expect(onStatusChange).toHaveBeenCalledWith("waiting");
  });

  it("shows what a search found in place of the view", async () => {
    const { client } = renderList({ search: "ship", searchText: "ship" });
    expect(await screen.findByText("Found it")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Results" })).toBeInTheDocument();
    expect(client.conversations.search).toHaveBeenCalledWith("ship");
    expect(client.conversations.list).not.toHaveBeenCalled();
  });

  it("says the team is caught up when nothing is open", async () => {
    renderList({}, { list: [] });
    expect(await screen.findByRole("heading", { name: "All caught up" })).toBeInTheDocument();
  });

  it("offers a way to retry after a failure", async () => {
    const { client } = renderList({}, { list: new Error("offline") });
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(client.conversations.list).toHaveBeenCalledTimes(2);
  });
});

describe("DetailsPanel", () => {
  it("shows how to reach the contact, and says what was not given", () => {
    render(
      withClient(
        <DetailsPanel conversation={conversation()} team={[]} teams={[]} onChange={vi.fn()} />,
      ),
    );
    const details = screen.getByRole("region", { name: "Details" });

    expect(within(details).getByRole("link", { name: "priya@example.org" })).toHaveAttribute(
      "href",
      "mailto:priya@example.org",
    );
    expect(within(details).getByText("Not given")).toBeInTheDocument();
    expect(within(details).getByText("Guest")).toBeInTheDocument();
  });

  it("links to the page the visitor wrote from, by its title", () => {
    render(
      withClient(
        <DetailsPanel
          team={[]}
          teams={[]}
          onChange={vi.fn()}
          conversation={conversation({
            context: { url: "https://example.com/pricing", title: "Pricing" },
          })}
        />,
      ),
    );
    expect(screen.getByRole("link", { name: /Pricing/ })).toHaveAttribute(
      "href",
      "https://example.com/pricing",
    );
  });

  it("marks a verified user apart from one who only claims to be", () => {
    const { contact } = conversation();
    const { rerender } = render(
      withClient(
        <DetailsPanel
          team={[]}
          teams={[]}
          onChange={vi.fn()}
          conversation={conversation({ contact: { ...contact, kind: "user", verified: true } })}
        />,
      ),
    );
    expect(screen.getByText("Verified user")).toBeInTheDocument();

    rerender(
      withClient(
        <DetailsPanel
          team={[]}
          teams={[]}
          onChange={vi.fn()}
          conversation={conversation({ contact: { ...contact, kind: "user", verified: false } })}
        />,
      ),
    );
    expect(screen.getByText("Unverified user")).toBeInTheDocument();
  });

  it("asks before resolving, and changes nothing when the answer is no", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      withClient(
        <DetailsPanel conversation={conversation()} team={[]} teams={[]} onChange={onChange} />,
      ),
    );

    await user.click(screen.getByRole("button", { name: /^Status:/ }));
    await user.click(screen.getByRole("option", { name: "Resolved" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Resolve this conversation?" });
    expect(dialog).toHaveTextContent("Priya Nair will see that it is resolved");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Status:/ }));
    await user.click(screen.getByRole("option", { name: "Resolved" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Resolve" }),
    );
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ status: "resolved" });
    });
  });

  it("asks before closing a ticket, and not before a status that ends nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      withClient(
        <DetailsPanel
          team={[]}
          teams={[]}
          onChange={onChange}
          conversation={conversation({ type: "ticket", ticketNumber: 1042 })}
        />,
      ),
    );

    await user.click(screen.getByRole("button", { name: /^Status:/ }));
    await user.click(screen.getByRole("option", { name: "Waiting" }));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ status: "pending" });
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Status:/ }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Close this ticket?" });
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ status: "closed" });
    });
  });

  it("gives the conversation to a team", async () => {
    const onChange = vi.fn();
    const teams = [{ id: "44444444-4444-4444-8444-444444444444", name: "Billing", memberIds: [] }];
    render(
      withClient(
        <DetailsPanel conversation={conversation()} team={[]} teams={teams} onChange={onChange} />,
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: /^Team:/ }));
    await userEvent.click(screen.getByRole("option", { name: "Billing" }));
    expect(onChange).toHaveBeenCalledWith({ teamId: teams[0]?.id });
  });
});
