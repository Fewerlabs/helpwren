import { parseSettings, type Article, type HelpwrenClient } from "@helpwren/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getReaderClient } from "../client";
import { ArticleFeedback } from "./article-feedback";
import { ArticleView } from "./article-view";
import { HelpFooter } from "./help-footer";
import { HelpHeader } from "./help-header";
import { JsonLd } from "./json-ld";

vi.mock("../client", () => ({ getReaderClient: vi.fn() }));
// The chat link makes the widget, which needs a page of its own to live in.
vi.mock("./help-chat", () => ({ ChatLink: () => <a href="/chat">Chat with us</a> }));

const settings = parseSettings([
  { key: "brand", value: { name: "Acme", accent: "#1d4ed8" } },
  {
    key: "help_center",
    value: {
      title: "Acme answers",
      searchPlaceholder: "Search Acme help",
      headerLinks: [{ label: "Back to Acme", url: "https://acme.example" }],
      footerLinks: [{ label: "Privacy", url: "/privacy" }],
    },
  },
]);

const text = (value: string) => ({ type: "text" as const, text: value });
const article: Article = {
  id: "11111111-1111-4111-8111-111111111111",
  collectionId: "22222222-2222-4222-8222-222222222222",
  collection: { id: "22222222-2222-4222-8222-222222222222", name: "Billing", slug: "billing" },
  title: "Read your invoice",
  slug: "read-your-invoice",
  summary: "What each line means.",
  status: "published",
  position: 1,
  authorId: null,
  publishedAt: "2026-11-01T10:00:00Z",
  updatedAt: "2026-11-18T10:00:00Z",
  tags: ["billing"],
  visibility: "public",
  featured: false,
  metaTitle: null,
  metaDescription: null,
  body: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [text("Download an invoice")] },
      { type: "paragraph", content: [text("Open Billing, then Invoices.")] },
      { type: "heading", attrs: { level: 2 }, content: [text("Change the address")] },
    ],
  },
};

describe("HelpHeader", () => {
  it("greets on the home page, in the brand's words, with a search that works as a form", () => {
    render(<HelpHeader settings={settings} variant="home" />);
    expect(screen.getByRole("heading", { level: 1, name: "Acme answers" })).toBeInTheDocument();
    const search = screen.getByRole("search");
    expect(search).toHaveAttribute("action", "/help/search");
    expect(within(search).getByRole("searchbox", { name: "Search Acme help" })).toHaveAttribute(
      "name",
      "q",
    );
    expect(screen.getByRole("link", { name: "Back to Acme" })).toHaveAttribute(
      "href",
      "https://acme.example",
    );
  });

  it("keeps what was searched for in the box on inner pages", () => {
    render(<HelpHeader settings={settings} variant="inner" query="refund" />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    for (const box of screen.getAllByRole("searchbox")) expect(box).toHaveValue("refund");
  });
});

describe("HelpFooter", () => {
  it("shows the brand's links and one small credit", () => {
    render(<HelpFooter settings={settings} />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Powered by Helpwren" })).toBeInTheDocument();
    expect(screen.getByText(/© \d{4} Acme/)).toBeInTheDocument();
  });
});

describe("ArticleView", () => {
  it("draws the way back, the article and a table of contents from its headings", () => {
    render(<ArticleView article={article} related={[]} />);
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Billing" })).toHaveAttribute(
      "href",
      "/help/billing",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Read your invoice" })).toBeVisible();
    const contents = screen.getByRole("navigation", { name: "On this page" });
    expect(within(contents).getByRole("link", { name: "Change the address" })).toHaveAttribute(
      "href",
      "#change-the-address",
    );
    expect(screen.getByText("Was this helpful?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat with us" })).toBeInTheDocument();
  });

  it("lists related articles, and leaves the extras out of a preview", () => {
    const other = { ...article, id: "33333333-3333-4333-8333-333333333333", title: "Pay by card" };
    const { rerender } = render(<ArticleView article={article} related={[other]} />);
    expect(screen.getByRole("list", { name: "Related articles" })).toHaveTextContent("Pay by card");

    rerender(<ArticleView article={article} related={[other]} preview />);
    expect(screen.queryByText("Was this helpful?")).toBeNull();
    expect(screen.queryByRole("list", { name: "Related articles" })).toBeNull();
  });
});

describe("ArticleFeedback", () => {
  const sendFeedback = vi.fn();
  beforeEach(() => {
    window.localStorage.clear();
    sendFeedback.mockReset().mockResolvedValue({ ok: true });
    vi.mocked(getReaderClient).mockReturnValue({
      articles: { sendFeedback },
    } as unknown as HelpwrenClient);
  });

  it("records the answer, says thanks, and does not ask again", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ArticleFeedback articleId={article.id} />);
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(sendFeedback).toHaveBeenCalledWith(article.id, true);
    expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument();

    unmount();
    render(<ArticleFeedback articleId={article.id} />);
    expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
  });

  it("says so when the answer could not be sent, and lets the reader try again", async () => {
    const user = userEvent.setup();
    sendFeedback.mockRejectedValue(new Error("offline"));
    render(<ArticleFeedback articleId={article.id} />);
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That did not send.");
    expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
  });
});

describe("JsonLd", () => {
  it("cannot be ended early by what an article is called", () => {
    const { container } = render(
      <JsonLd data={{ headline: "</script><script>alert(1)</script>" }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toContain("</script>");
    expect(JSON.parse(script?.innerHTML ?? "{}")).toEqual({
      headline: "</script><script>alert(1)</script>",
    });
  });
});
