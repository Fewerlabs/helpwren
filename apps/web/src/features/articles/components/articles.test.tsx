import { type ArticleSummary, type Collection, type HelpwrenClient } from "@helpwren/core";
import { ConfirmProvider, Toaster, TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { Articles } from "./articles";

// The help center is told to read again once a save is done. Held here, so a test can look at
// the screen while that is still on its way.
let refreshed: () => void = () => undefined;
vi.mock("../actions", () => ({
  refreshHelpCenter: vi.fn(
    () =>
      new Promise<void>((resolve) => {
        refreshed = resolve;
      }),
  ),
}));
// The address says the Bookings collection is open.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("collection=bookings"),
  usePathname: () => "/dashboard/help",
}));

const bookings: Collection = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Bookings",
  slug: "bookings",
  description: null,
  icon: "calendar",
  position: 1,
  updatedAt: "2026-11-20T10:00:00Z",
  articleCount: 0,
};
// Renamed, with an address of its own, so the one on screen no longer finds it.
const reservations: Collection = { ...bookings, name: "Reservations", slug: "reservations" };

const collections = { list: vi.fn(), update: vi.fn(), create: vi.fn(), remove: vi.fn() };
const client = {
  collections,
  articles: {
    list: vi.fn(() =>
      Promise.resolve<{ items: ArticleSummary[]; total: number }>({ items: [], total: 0 }),
    ),
    publishMany: vi.fn(),
    unpublishMany: vi.fn(),
    moveMany: vi.fn(),
    removeMany: vi.fn(),
    counts: vi.fn(() => Promise.resolve({ total: 0, uncategorised: 0 })),
    tags: vi.fn(() => Promise.resolve([])),
    feedbackTotals: vi.fn(() => Promise.resolve({})),
  },
  agents: { list: vi.fn(() => Promise.resolve([])) },
} as unknown as HelpwrenClient;

/** The Bookings collection's menu in the navigation; the one beside its name is for phones. */
function collectionMenu() {
  const [first] = screen.getAllByRole("button", {
    name: "More actions for the Bookings collection",
  });
  if (!first) throw new Error("The collection has no menu.");
  return first;
}
async function findCollectionMenu() {
  await screen.findAllByRole("button", { name: "More actions for the Bookings collection" });
  return collectionMenu();
}

function renderArticles() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <HelpwrenProvider getClient={() => client}>
        <TooltipProvider>
          <ConfirmProvider>
            <Articles />
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </HelpwrenProvider>
    </QueryClientProvider>,
  );
}

describe("the help center's collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collections.list.mockResolvedValue([bookings]);
    collections.update.mockImplementation(() => {
      collections.list.mockResolvedValue([reservations]);
      return Promise.resolve({ ok: true, collection: reservations });
    });
  });

  it("closes the form after a rename, and never turns it into a new collection's", async () => {
    const user = userEvent.setup();
    renderArticles();

    await user.click(await findCollectionMenu());
    await user.click(screen.getByRole("menuitem", { name: "Edit collection" }));
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Reservations");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // The collections have reloaded under their new names while the save finishes.
    await waitFor(() => {
      expect(collections.list).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: "New collection" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Edit collection" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Reservations");

    refreshed();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Collection saved")).toBeInTheDocument();
  });
});

function article(id: string, title: string, status: ArticleSummary["status"]): ArticleSummary {
  return {
    id,
    collectionId: bookings.id,
    collection: { id: bookings.id, name: bookings.name, slug: bookings.slug },
    title,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    summary: null,
    status,
    position: 1,
    authorId: null,
    author: null,
    publishedAt: null,
    updatedAt: "2026-11-21T10:00:00Z",
    tags: [],
    visibility: "public",
    featured: false,
    metaTitle: null,
    metaDescription: null,
    audiences: [],
    locale: null,
    fields: {},
  };
}

describe("changing articles from the list", () => {
  const deposit = article("22222222-2222-4222-8222-222222222222", "Paying a deposit", "draft");
  const refund = article("33333333-3333-4333-8333-333333333333", "Getting a refund", "published");
  const billing: Collection = {
    ...bookings,
    id: "44444444-4444-4444-8444-444444444444",
    name: "Billing",
    slug: "billing",
  };
  const api = client.articles as unknown as Record<
    "list" | "publishMany" | "unpublishMany" | "moveMany" | "removeMany",
    ReturnType<typeof vi.fn>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    collections.list.mockResolvedValue([bookings, billing]);
    api.list.mockResolvedValue({ items: [deposit, refund], total: 2 });
    api.publishMany.mockResolvedValue({ changed: 1 });
    api.moveMany.mockResolvedValue({ changed: 2 });
    api.removeMany.mockResolvedValue({ changed: 1 });
  });

  /** The table once the collection in the address is on screen, not the list for phones. */
  async function table() {
    await findCollectionMenu();
    await screen.findAllByText("Paying a deposit");
    return within(screen.getByRole("table"));
  }

  it("moves the ticked articles together, then starts with none ticked", async () => {
    const user = userEvent.setup();
    renderArticles();
    const rows = await table();

    await user.click(rows.getByRole("checkbox", { name: "Select Paying a deposit" }));
    await user.click(rows.getByRole("checkbox", { name: "Select Getting a refund" }));
    const bar = within(screen.getByRole("toolbar", { name: "Selected rows" }));
    expect(screen.getByRole("toolbar")).toHaveTextContent("2 articles selected");

    await user.click(bar.getByRole("button", { name: "Move to" }));
    // The collection on screen is not somewhere to move to.
    expect(screen.queryByRole("menuitem", { name: "Bookings" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Billing" }));

    expect(api.moveMany).toHaveBeenCalledWith([deposit.id, refund.id], billing.id);
    refreshed();
    expect(await screen.findByText("2 articles moved to Billing")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("publishes a draft from its row's menu, which stays up until it is done", async () => {
    let published: (result: { changed: number }) => void = () => undefined;
    api.publishMany.mockReturnValue(
      new Promise((resolve) => {
        published = resolve;
      }),
    );
    const user = userEvent.setup();
    renderArticles();
    const rows = await table();

    await user.click(rows.getByRole("button", { name: "More actions for Paying a deposit" }));
    await user.click(screen.getByRole("menuitem", { name: "Publish" }));
    expect(api.publishMany).toHaveBeenCalledWith([deposit.id]);
    expect(screen.getByRole("menuitem", { name: /Publish/ })).toHaveAttribute("aria-busy", "true");

    published({ changed: 1 });
    await waitFor(() => {
      refreshed();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Article published")).toBeInTheDocument();
  });

  it("asks before deleting an article from its row's menu", async () => {
    const user = userEvent.setup();
    renderArticles();
    const rows = await table();

    await user.click(rows.getByRole("button", { name: "More actions for Getting a refund" }));
    // A published article is offered Unpublish, not Publish.
    expect(screen.getByRole("menuitem", { name: "Unpublish" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(api.removeMany).not.toHaveBeenCalled();

    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText('Delete "Getting a refund"?')).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(api.removeMany).toHaveBeenCalledWith([refund.id]);
    });
    refreshed();
    expect(await screen.findByText("Article deleted")).toBeInTheDocument();
  });

  it("deletes the collection on screen, keeping its articles as drafts", async () => {
    collections.list.mockResolvedValue([{ ...bookings, articleCount: 2 }, billing]);
    collections.remove.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderArticles();
    await table();

    await user.click(collectionMenu());
    await user.click(screen.getByRole("menuitem", { name: "Delete collection" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(
      dialog.getByText(/Its 2 articles are kept as drafts in no collection/),
    ).toBeInTheDocument();
    expect(collections.remove).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(collections.remove).toHaveBeenCalledWith(bookings.id, { releaseArticles: true });
    });
    refreshed();
    expect(await screen.findByText("Collection deleted")).toBeInTheDocument();
  });
});
