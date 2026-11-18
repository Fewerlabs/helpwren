import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../base/button/button";
import { ArticleCard } from "./article-card/article-card";
import { CodeSnippet } from "./code-snippet/code-snippet";
import { ConversationListItem } from "./conversation-list-item/conversation-list-item";
import { EmptyState } from "./empty-state/empty-state";
import { Highlight } from "./highlight/highlight";
import { MarginNote } from "./margin-note/margin-note";
import { MessageBubble } from "./message-bubble/message-bubble";
import { PageHeader } from "./page-header/page-header";
import { SearchField } from "./search-field/search-field";

describe("EmptyState", () => {
  it("shows a heading, a description, an action and a decorative wren", () => {
    const { container } = render(
      <EmptyState
        title="All caught up"
        description="Nothing is waiting."
        action={<Button>New conversation</Button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "All caught up" })).toBeInTheDocument();
    expect(screen.getByText("Nothing is waiting.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot='wren']")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-slot='wren']")).toHaveAttribute(
      "data-scene",
      "all-caught-up",
    );
  });

  it("takes another scene, a heading level, or no illustration at all", () => {
    const { container, rerender } = render(
      <EmptyState title="No articles" scene="help-articles" headingLevel={3} />,
    );
    expect(container.querySelector("[data-scene='help-articles']")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    rerender(<EmptyState title="No articles" scene={false} />);
    expect(container.querySelector("[data-slot='wren']")).not.toBeInTheDocument();
  });
});

describe("SearchField", () => {
  it("reports what is typed and searches on Enter", async () => {
    const onValueChange = vi.fn();
    const onSearch = vi.fn();
    render(
      <SearchField
        aria-label="Search articles"
        onValueChange={onValueChange}
        onSearch={onSearch}
      />,
    );
    const input = screen.getByRole("searchbox", { name: "Search articles" });

    await userEvent.type(input, "refund{Enter}");

    expect(onValueChange).toHaveBeenLastCalledWith("refund");
    expect(onSearch).toHaveBeenCalledWith("refund");
  });

  it("shows a clear button only when there is text, and clears with it or with Escape", async () => {
    const user = userEvent.setup();
    render(<SearchField aria-label="Search" shortcut="⌘K" />);
    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();

    await user.type(input, "refund");
    expect(screen.queryByText("⌘K")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();

    await user.type(input, "login");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("");
  });

  it("announces that it is searching while loading", () => {
    render(<SearchField aria-label="Search" loading />);
    expect(screen.getByRole("status", { name: "Searching" })).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders the title as a level 1 heading with eyebrow, description and actions", () => {
    render(
      <PageHeader
        eyebrow="#open"
        title="Inbox"
        description="Conversations waiting for a reply."
        actions={<Button>New</Button>}
      />,
    );
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByText("#open")).toBeInTheDocument();
    expect(screen.getByText("Conversations waiting for a reply.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  it("takes another heading level", () => {
    render(<PageHeader title="Settings" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Settings" })).toBeInTheDocument();
  });
});

describe("CodeSnippet", () => {
  it("shows the code and copies it, then says so", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const onCopied = vi.fn();
    const code = '<script src="https://support.example.com/widget.js"></script>';
    render(<CodeSnippet code={code} language="HTML" onCopied={onCopied} />);

    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByText("HTML")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(code);
    expect(onCopied).toHaveBeenCalledWith(code);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});

describe("MessageBubble", () => {
  it("fills your own messages with the accent and tints the other person's, and says who is speaking", () => {
    render(
      <>
        <MessageBubble from="self" time="10:02">
          Thanks
        </MessageBubble>
        <MessageBubble from="other" author="Ada" time="10:03">
          You are welcome
        </MessageBubble>
      </>,
    );
    const own = screen.getByText("Thanks");
    const theirs = screen.getByText("You are welcome");
    expect(own).toHaveClass("bg-primary");
    expect(own).toHaveTextContent("You: Thanks");
    expect(theirs).toHaveClass("bg-muted");
    expect(theirs).not.toHaveClass("bg-primary");
    expect(theirs).toHaveTextContent("Ada: You are welcome");
    expect(screen.getByText("10:02")).toBeInTheDocument();
  });

  it("shows an avatar beside the other person's message in place of their name", () => {
    render(
      <MessageBubble from="other" author="Ada" avatar={<span data-testid="avatar" />}>
        Hello
      </MessageBubble>,
    );
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    // The name is still read out, with the message.
    expect(screen.getByText("Hello")).toHaveTextContent("Ada: Hello");
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("shows files under the words, and no bubble when there are only files", () => {
    const { rerender } = render(
      <MessageBubble from="other" author="Ada" attachments={<a href="/invoice.pdf">invoice.pdf</a>}>
        Here it is
      </MessageBubble>,
    );
    expect(screen.getByText("Here it is")).toHaveClass("bg-muted");
    expect(screen.getByRole("link", { name: "invoice.pdf" })).toBeInTheDocument();

    rerender(
      <MessageBubble from="other" author="Ada" attachments={<a href="/invoice.pdf">invoice.pdf</a>}>
        {""}
      </MessageBubble>,
    );
    expect(document.querySelector(".bg-muted")).toBeNull();
    // Who sent it is still read out, with the files.
    expect(screen.getByText("Ada:", { exact: false })).toBeInTheDocument();
  });

  it("labels an internal note", () => {
    render(
      <MessageBubble from="self" note>
        Customer is on the Pro plan
      </MessageBubble>,
    );
    expect(screen.getByText("Internal note")).toBeInTheDocument();
  });
});

describe("ConversationListItem", () => {
  it("is a link with the name, preview, time, status and unread count", () => {
    render(
      <ConversationListItem
        href="/inbox/42"
        name="Ada Lovelace"
        preview="I was charged twice"
        time="2m"
        status="open"
        unread={3}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/inbox/42");
    expect(link).toHaveTextContent("Ada Lovelace");
    expect(link).toHaveTextContent("I was charged twice");
    expect(link).toHaveTextContent("2m");
    expect(link).toHaveTextContent("Open");
    expect(link).toHaveTextContent("3 unread");
  });

  it("is a button without href, and marks the selected conversation", async () => {
    const onClick = vi.fn();
    render(
      <ConversationListItem name="Grace Hopper" preview="Thanks" selected onClick={onClick} />,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-current", "true");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("ArticleCard", () => {
  it("is one link holding the category, title, summary and meta", () => {
    render(
      <ArticleCard
        href="/help/refunds"
        category="Billing"
        title="How refunds work"
        summary="When you get your money back."
        meta="Updated 3 days ago"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/help/refunds");
    expect(link).toHaveTextContent("Billing");
    expect(link).toHaveTextContent("How refunds work");
    expect(link).toHaveTextContent("When you get your money back.");
    expect(link).toHaveTextContent("Updated 3 days ago");
  });
});

describe("MarginNote", () => {
  it("writes the note in the handwriting font and red pen, with a decorative arrow", () => {
    const { container } = render(<MarginNote>small bird, big voice</MarginNote>);
    const note = screen.getByText("small bird, big voice").closest("p");
    expect(note).toHaveClass("font-hand", "text-pen");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("can drop the arrow", () => {
    const { container } = render(<MarginNote arrow="none">just a note</MarginNote>);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});

describe("Highlight", () => {
  it("marks text with the highlighter by default, or underlines it in red pen", () => {
    render(
      <p>
        <Highlight>ten minutes</Highlight> and <Highlight variant="pen">free</Highlight>
      </p>,
    );
    const highlighted = screen.getByText("ten minutes");
    expect(highlighted.tagName).toBe("MARK");
    expect(highlighted).toHaveClass("bg-highlighter", "text-highlighter-foreground");
    expect(screen.getByText("free")).toHaveClass("decoration-pen", "underline");
  });
});
