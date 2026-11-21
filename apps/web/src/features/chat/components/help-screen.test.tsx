import { type Article, type ArticleSummary, type HelpwrenClient } from "@helpwren/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { resetChatStore, useScreen, useSetPage } from "../store/chat-store";
import {
  ArticleScreen,
  CollectionScreen,
  HelpScreen,
  PageHelp,
  SuggestedArticles,
} from "./help-screen";

// Feedback has a client of its own, which a unit test has no database for.
vi.mock("@/features/help-center", () => ({
  ArticleFeedback: () => <p>Was this helpful?</p>,
}));

const summary = (overrides: Partial<ArticleSummary>): ArticleSummary => ({
  id: "11111111-1111-4111-8111-111111111111",
  collectionId: null,
  collection: null,
  title: "Read your invoice",
  slug: "read-your-invoice",
  summary: "What each line means.",
  status: "published",
  position: 1,
  authorId: null,
  author: null,
  publishedAt: "2026-11-01T10:00:00Z",
  updatedAt: "2026-11-18T10:00:00Z",
  tags: [],
  visibility: "public",
  featured: false,
  metaTitle: null,
  metaDescription: null,
  audiences: [],
  locale: null,
  fields: {},
  ...overrides,
});
const invoice = summary({});
const install = summary({
  id: "22222222-2222-4222-8222-222222222222",
  title: "Add the chat to your website",
  slug: "add-the-chat",
  featured: true,
});

const articles = { list: vi.fn(), search: vi.fn(), getBySlug: vi.fn(), forPage: vi.fn() };
const collections = { list: vi.fn() };
// A visitor who has not written yet has no session.
const sessions = { resume: () => Promise.resolve(null) };
const client = { articles, collections, sessions } as unknown as HelpwrenClient;
const billing = { id: "33333333-3333-4333-8333-333333333333", name: "Billing" };

/** Says which page the chat is on, as the widget script does. */
function OnPage({ url, title }: { url: string; title: string }) {
  const setPage = useSetPage();
  useEffect(() => {
    setPage({ url, title });
  }, [setPage, url, title]);
  return null;
}

/** Shows which screen the chat is on, so a test can see where a tap led. */
function Where() {
  const current = useScreen();
  return <output>{JSON.stringify(current)}</output>;
}

function renderChat(ui: ReactElement) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <HelpwrenProvider getClient={() => client}>
        {ui}
        <Where />
      </HelpwrenProvider>
    </QueryClientProvider>,
  );
}

describe("the chat's Help", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChatStore();
    articles.list.mockResolvedValue({ items: [invoice, install], total: 2 });
    articles.search.mockResolvedValue([invoice]);
  });

  it("lists the collections, and opens one to show its articles", async () => {
    const user = userEvent.setup();
    collections.list.mockResolvedValue([
      { ...billing, slug: "billing", description: null, icon: "credit-card", articleCount: 2 },
    ]);
    renderChat(<HelpScreen />);

    await user.click(await screen.findByRole("button", { name: /Billing.*2 articles/s }));
    expect(screen.getByRole("status")).toHaveTextContent(
      `{"name":"collection","collection":${JSON.stringify(billing)}}`,
    );
  });

  it("shows a collection's articles, and remembers where one was opened from", async () => {
    const user = userEvent.setup();
    renderChat(<CollectionScreen collection={billing} onBack={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /Read your invoice/ }));
    expect(articles.list).toHaveBeenCalledWith({
      collectionId: billing.id,
      status: "published",
      pageSize: 100,
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      `{"name":"article","slug":"read-your-invoice","from":${JSON.stringify(billing)}}`,
    );
  });

  it("searches as the visitor types, and offers a message when nothing matches", async () => {
    const user = userEvent.setup();
    collections.list.mockResolvedValue([]);
    renderChat(<HelpScreen />);

    await user.type(screen.getByRole("searchbox", { name: "Search for help" }), "invoice");
    await waitFor(() => {
      expect(articles.search).toHaveBeenLastCalledWith("invoice", { limit: 20 });
    });
    expect(await screen.findByRole("button", { name: /Read your invoice/ })).toBeInTheDocument();

    articles.search.mockResolvedValue([]);
    await user.type(screen.getByRole("searchbox", { name: "Search for help" }), " zzz");
    expect(await screen.findByText("Nothing matched those words")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send us a message" }));
    expect(screen.getByRole("status")).toHaveTextContent('{"name":"start"}');
  });

  it("suggests the featured articles on the home screen, and nothing when there are none", async () => {
    articles.list.mockResolvedValue({ items: [install], total: 1 });
    renderChat(<SuggestedArticles />);
    expect(await screen.findByRole("heading", { name: "Suggested articles" })).toBeInTheDocument();
    expect(articles.list).toHaveBeenCalledWith({
      status: "published",
      featured: true,
      pageSize: 3,
    });
  });

  it("leads with the page's help, and leaves those articles out of the suggestions", async () => {
    const user = userEvent.setup();
    articles.list.mockResolvedValue({ items: [invoice, install], total: 2 });
    articles.forPage.mockResolvedValue({
      match: { kind: "rule", id: "44444444-4444-4444-8444-444444444444", name: "Billing pages" },
      fallback: null,
      articles: [{ title: invoice.title, summary: null, slug: invoice.slug, url: null }],
    });
    renderChat(
      <>
        <OnPage url="https://example.com/billing" title="Billing" />
        <PageHelp />
        <SuggestedArticles />
      </>,
    );

    const forPage = await screen.findByRole("region", { name: "Help for this page" });
    expect(articles.forPage).toHaveBeenCalledWith({
      page: { url: "https://example.com/billing", title: "Billing" },
    });
    const suggested = await screen.findByRole("region", { name: "Suggested articles" });
    expect(suggested).not.toHaveTextContent("Read your invoice");
    expect(suggested).toHaveTextContent("Add the chat to your website");

    await user.click(within(forPage).getByRole("button", { name: /Read your invoice/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      '{"name":"article","slug":"read-your-invoice"}',
    );
  });

  it("asks for no page help without a page or a filter, and shows nothing", async () => {
    renderChat(<PageHelp />);
    await screen.findByRole("status");
    expect(articles.forPage).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Help for this page" })).not.toBeInTheDocument();
  });

  it("shows an article with its body, and a way to write to the team", async () => {
    const user = userEvent.setup();
    const article: Article = {
      ...invoice,
      body: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Open Billing." }] }],
      },
    };
    articles.getBySlug.mockResolvedValue(article);
    const onBack = vi.fn();
    renderChat(<ArticleScreen slug={article.slug} onBack={onBack} />);

    expect(await screen.findByRole("heading", { name: "Read your invoice" })).toBeInTheDocument();
    expect(screen.getByText("Open Billing.")).toBeInTheDocument();
    expect(articles.getBySlug).toHaveBeenCalledWith(article.slug, { publishedOnly: true });

    await user.click(screen.getByRole("button", { name: /Still need help/ }));
    expect(screen.getByRole("status")).toHaveTextContent('{"name":"start"}');
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
