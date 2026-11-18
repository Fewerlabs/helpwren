import { type Article, type HelpwrenClient } from "@helpwren/core";
import { ConfirmProvider, Toaster, TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { ArticleEditor } from "./article-editor";

// The action runs on the server and the router belongs to Next; neither exists in a unit test.
vi.mock("../actions", () => ({ refreshHelpCenter: vi.fn(() => Promise.resolve()) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

// The editor asks the browser where the caret is. jsdom lays nothing out.
beforeAll(() => {
  const nowhere = new DOMRect(0, 0, 0, 0);
  Range.prototype.getBoundingClientRect = () => nowhere;
  Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
  document.elementFromPoint = () => null;
});

const draft: Article = {
  id: "11111111-1111-4111-8111-111111111111",
  collectionId: null,
  collection: null,
  title: "Reset your password",
  slug: "reset-your-password",
  summary: null,
  status: "draft",
  position: 1,
  authorId: "22222222-2222-4222-8222-222222222222",
  publishedAt: null,
  updatedAt: new Date().toISOString(),
  tags: ["passwords"],
  visibility: "public",
  featured: false,
  metaTitle: null,
  metaDescription: null,
  body: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Open Settings." }] }],
  },
};

const articles = {
  get: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  remove: vi.fn(),
  feedbackTotals: vi.fn(),
  uploadImage: vi.fn(),
};
const client = {
  articles,
  collections: { list: vi.fn(() => Promise.resolve([])) },
  agents: { list: vi.fn(() => Promise.resolve([])) },
} as unknown as HelpwrenClient;

async function renderEditor() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <HelpwrenProvider getClient={() => client}>
        <TooltipProvider>
          <ConfirmProvider>
            <ArticleEditor articleId={draft.id} />
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </HelpwrenProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("textbox", { name: "Article body" });
}

describe("ArticleEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    articles.get.mockResolvedValue(draft);
    articles.feedbackTotals.mockResolvedValue({});
  });

  it("opens with nothing to save", async () => {
    await renderEditor();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Reset your password");
    expect(screen.getByRole("status").textContent).toMatch(/^Saved/);
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("says when there are unsaved changes, and saves only what changed", async () => {
    const user = userEvent.setup();
    articles.update.mockResolvedValue({
      ok: true,
      article: { ...draft, title: "Reset your password quickly" },
    });
    await renderEditor();

    await user.type(screen.getByRole("textbox", { name: "Title" }), " quickly");
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(articles.update).toHaveBeenCalledWith(draft.id, {
      title: "Reset your password quickly",
    });
    expect(await screen.findByText("Draft saved")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/^Saved/);
  });

  it("puts a refused slug beside the slug, where it can be fixed", async () => {
    const user = userEvent.setup();
    articles.update.mockResolvedValue({ ok: false, reason: "slug_taken" });
    await renderEditor();

    const slugField = screen.getByRole("textbox", { name: "Slug" });
    await user.clear(slugField);
    await user.type(slugField, "Password Help");
    // Typed as words, kept as a slug.
    expect(slugField).toHaveValue("password-help");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText(/Another article already has that slug/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
  });

  it("saves tags, visibility and what search engines are told", async () => {
    const user = userEvent.setup();
    articles.update.mockResolvedValue({ ok: true, article: draft });
    await renderEditor();

    await user.type(screen.getByRole("textbox", { name: "Tags" }), "Sign-In{Enter}");
    await user.type(screen.getByRole("textbox", { name: "SEO title" }), "Password help");
    await user.click(screen.getByRole("switch", { name: /Featured/ }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(articles.update).toHaveBeenCalledWith(draft.id, {
      tags: ["passwords", "sign-in"],
      featured: true,
      metaTitle: "Password help",
    });
  });

  it("explains why an article with no collection cannot be published", async () => {
    const user = userEvent.setup();
    articles.publish.mockResolvedValue({ ok: false, reason: "needs_collection" });
    await renderEditor();

    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText(/Choose a collection first/)).toBeInTheDocument();
  });

  it("asks before removing, and removes nothing when the answer is no", async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.click(screen.getByRole("button", { name: "Remove article" }));
    const dialog = screen.getByRole("alertdialog", { name: 'Remove "Reset your password"?' });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(articles.remove).not.toHaveBeenCalled();

    articles.remove.mockResolvedValue({ ok: true });
    await user.click(screen.getByRole("button", { name: "Remove article" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }),
    );
    expect(articles.remove).toHaveBeenCalledWith(draft.id);
    expect(await screen.findByText("Article removed")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/dashboard/help");
  });

  it("asks before leaving with unsaved changes", async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.type(screen.getByRole("textbox", { name: "Title" }), "!");
    await user.click(screen.getByRole("button", { name: "Help center" }));
    const dialog = screen.getByRole("alertdialog", { name: "Leave without saving?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep writing" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("says so when the article does not exist", async () => {
    articles.get.mockResolvedValue(null);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <HelpwrenProvider getClient={() => client}>
          <ConfirmProvider>
            <ArticleEditor articleId={draft.id} />
          </ConfirmProvider>
        </HelpwrenProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("This article does not exist")).toBeInTheDocument();
  });
});
