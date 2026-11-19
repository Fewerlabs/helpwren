import { parseSettings, type Article, type HelpwrenClient } from "@helpwren/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getReaderClient } from "../client";
import { ArticleFeedback } from "./article-feedback";
import { ArticleView } from "./article-view";
import { Contents } from "./contents";
import { HelpHero } from "./help-hero";
import { HelpShell } from "./help-shell";
import { JsonLd } from "./json-ld";

vi.mock("../client", () => ({ getReaderClient: vi.fn() }));
// The router belongs to Next, which a unit test does not have.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/help",
}));
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
  author: { name: "Ada Okafor", photo: null },
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

const nav = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Billing",
    slug: "billing",
    icon: "credit-card",
    articles: [
      { id: article.id, title: article.title, slug: article.slug },
      { id: "33333333-3333-4333-8333-333333333333", title: "Pay by card", slug: "pay-by-card" },
    ],
  },
];

describe("HelpShell", () => {
  it("frames a page with the brand's bar, the whole list of articles and the footer", () => {
    render(
      <HelpShell
        settings={settings}
        collections={nav}
        current={{ collection: "billing", article: "read-your-invoice" }}
        query="refund"
      >
        <p>The page</p>
      </HelpShell>,
    );
    expect(screen.getByRole("link", { name: "Back to Acme" })).toHaveAttribute(
      "href",
      "https://acme.example",
    );
    // The search is a plain form, and keeps what was searched for.
    const [search] = screen.getAllByRole("search");
    expect(search).toHaveAttribute("action", "/help/search");
    expect(screen.getAllByRole("searchbox", { name: "Search Acme help" })[0]).toHaveValue("refund");

    // Every article is one step away, and the one on screen is marked.
    const [list] = screen.getAllByRole("navigation", { name: "All articles" });
    if (!list) throw new Error("The list of articles was not drawn.");
    expect(within(list).getByRole("link", { name: "Read your invoice" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(list).getByRole("link", { name: "Pay by card" })).toHaveAttribute(
      "href",
      "/help/billing/pay-by-card",
    );

    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Powered by Helpwren" })).toBeInTheDocument();
    expect(screen.getByText(/© \d{4} Acme/)).toBeInTheDocument();
  });

  it("leaves the credit out when the install turned it off", () => {
    const quiet = parseSettings([{ key: "brand", value: { name: "Acme", poweredBy: false } }]);
    render(
      <HelpShell settings={quiet} collections={nav}>
        <p>The page</p>
      </HelpShell>,
    );
    expect(screen.queryByRole("link", { name: "Powered by Helpwren" })).toBeNull();
  });

  it("draws only the search and the page inside a host's frame", () => {
    const { rerender } = render(
      <HelpShell settings={settings} collections={nav} embed={{ hide: [] }}>
        <p>The page</p>
      </HelpShell>,
    );
    expect(screen.getByText("The page")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Powered by Helpwren" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "All articles" })).toBeNull();
    // Searching from inside the frame stays in the embedded form.
    expect(document.querySelector('input[type="hidden"][name="embed"]')).toHaveValue("1");

    rerender(
      <HelpShell settings={settings} collections={nav} embed={{ hide: ["search"] }}>
        <p>The page</p>
      </HelpShell>,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});

describe("searching", () => {
  it("opens the search window from the box and finds articles as the reader types", async () => {
    const user = userEvent.setup();
    const search = vi.fn().mockResolvedValue([article]);
    vi.mocked(getReaderClient).mockReturnValue({
      articles: { search },
    } as unknown as HelpwrenClient);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HelpShell settings={settings} collections={nav}>
          <p>The page</p>
        </HelpShell>
      </QueryClientProvider>,
    );

    const [box] = screen.getAllByRole("searchbox", { name: "Search Acme help" });
    if (!box) throw new Error("The search box was not drawn.");
    await user.click(box);
    const window = await screen.findByRole("dialog", { name: "Search the help center" });
    await user.type(within(window).getByRole("searchbox"), "invoice");

    expect(await within(window).findByRole("link", { name: /Read your invoice/ })).toHaveAttribute(
      "href",
      "/help/billing/read-your-invoice",
    );
    expect(search).toHaveBeenLastCalledWith("invoice", { visibility: "public", limit: 8 });
    expect(within(window).getByRole("link", { name: /See every result/ })).toHaveAttribute(
      "href",
      "/help/search?q=invoice",
    );
  });

  it("opens with ⌘K from anywhere on the page", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HelpShell settings={settings} collections={nav}>
          <p>The page</p>
        </HelpShell>
      </QueryClientProvider>,
    );
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog", { name: "Search the help center" })).toBeVisible();
  });
});

describe("HelpHero", () => {
  it("greets in the brand's words, with a large search", () => {
    render(<HelpHero settings={settings} />);
    expect(screen.getByRole("heading", { level: 1, name: "Acme answers" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search Acme help" })).toHaveAttribute(
      "name",
      "q",
    );
  });
});

describe("ArticleView", () => {
  const other = { ...article, id: "33333333-3333-4333-8333-333333333333", title: "Pay by card" };

  it("says which collection the article is in, and offers what comes next", () => {
    render(<ArticleView article={article} next={other} />);
    expect(screen.getByRole("link", { name: "Billing" })).toHaveAttribute("href", "/help/billing");
    expect(screen.getByRole("heading", { level: 1, name: "Read your invoice" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Ada Okafor" })).toBeInTheDocument();
    expect(screen.getByText("Written by")).toBeInTheDocument();
    expect(screen.getByText("Was this helpful?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat with us" })).toBeInTheDocument();
    const more = screen.getByRole("navigation", { name: "More in this collection" });
    expect(within(more).getByRole("link", { name: /Pay by card.*Next/s })).toBeInTheDocument();
  });

  it("leaves the extras out of a preview, and what a host hid out of its frame", () => {
    const { rerender } = render(<ArticleView article={article} next={other} preview />);
    expect(screen.queryByText("Was this helpful?")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "More in this collection" })).toBeNull();

    rerender(<ArticleView article={article} next={other} embed={{ hide: ["feedback", "chat"] }} />);
    expect(screen.queryByText("Was this helpful?")).toBeNull();
    expect(screen.queryByRole("link", { name: "Chat with us" })).toBeNull();
    // Inside the frame the way back is a breadcrumb, and links keep the frame's options.
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Billing" })).toHaveAttribute(
      "href",
      "/help/billing?embed=1&hide=feedback%2Cchat",
    );
  });
});

describe("Contents", () => {
  it("lists the article's headings as links to them", () => {
    render(
      <Contents
        headings={[
          { id: "download-an-invoice", text: "Download an invoice", level: 2 },
          { id: "change-the-address", text: "Change the address", level: 2 },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Change the address" })).toHaveAttribute(
      "href",
      "#change-the-address",
    );
    expect(screen.getByRole("link", { name: "Download an invoice" })).toHaveAttribute(
      "aria-current",
      "location",
    );
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
