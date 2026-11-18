import { type ConversationWithContact } from "@helpwren/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { contactName } from "../contact-name";
import { inboxViews } from "../hooks/use-inbox";
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

const all = inboxViews[6];
const open = inboxViews[2];

function renderList(props: Partial<ListPanelProps> = {}) {
  const handlers = { onRetry: vi.fn(), onSelect: vi.fn() };
  render(
    <ListPanel
      conversations={[conversation()]}
      failed={false}
      view={open}
      search=""
      onSearchChange={vi.fn()}
      searching={false}
      loading={false}
      selectedId={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
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
    const { onSelect } = renderList();
    const row = within(screen.getByRole("list", { name: "Conversations" })).getByRole("button");

    expect(row).toHaveTextContent("Priya Nair");
    expect(row).toHaveTextContent("Do you ship abroad?");
    expect(row).toHaveTextContent("2 unread");

    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  });

  it("is titled with the view it shows, and marks the open conversation", () => {
    renderList({ selectedId: "11111111-1111-4111-8111-111111111111" });
    expect(screen.getByRole("heading", { name: /Open/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { current: true })).toHaveTextContent("Priya Nair");
  });

  it("shows each conversation's status only when listing all of them", () => {
    renderList({
      conversations: [conversation({ status: "resolved", unreadForAgents: 0 })],
      view: all,
    });
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("says the team is caught up when nothing is open", () => {
    renderList({ conversations: [] });
    expect(screen.getByRole("heading", { name: "All caught up" })).toBeInTheDocument();
  });

  it("shows placeholders while loading, and a way to retry after a failure", async () => {
    const { onRetry } = renderList({ conversations: undefined, failed: true });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("DetailsPanel", () => {
  it("shows how to reach the contact, and says what was not given", () => {
    render(<DetailsPanel conversation={conversation()} team={[]} onChange={vi.fn()} />);
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
      <DetailsPanel
        team={[]}
        onChange={vi.fn()}
        conversation={conversation({
          context: { url: "https://example.com/pricing", title: "Pricing" },
        })}
      />,
    );
    expect(screen.getByRole("link", { name: /Pricing/ })).toHaveAttribute(
      "href",
      "https://example.com/pricing",
    );
  });

  it("marks a verified user apart from one who only claims to be", () => {
    const { contact } = conversation();
    const { rerender } = render(
      <DetailsPanel
        team={[]}
        onChange={vi.fn()}
        conversation={conversation({ contact: { ...contact, kind: "user", verified: true } })}
      />,
    );
    expect(screen.getByText("Verified user")).toBeInTheDocument();

    rerender(
      <DetailsPanel
        team={[]}
        onChange={vi.fn()}
        conversation={conversation({ contact: { ...contact, kind: "user", verified: false } })}
      />,
    );
    expect(screen.getByText("Unverified user")).toBeInTheDocument();
  });
});
