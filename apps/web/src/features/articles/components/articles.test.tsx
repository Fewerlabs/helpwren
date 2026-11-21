import { type Collection, type HelpwrenClient } from "@helpwren/core";
import { ConfirmProvider, Toaster, TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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

const collections = { list: vi.fn(), update: vi.fn(), create: vi.fn() };
const client = {
  collections,
  articles: {
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    counts: vi.fn(() => Promise.resolve({ total: 0, uncategorised: 0 })),
    tags: vi.fn(() => Promise.resolve([])),
    feedbackTotals: vi.fn(() => Promise.resolve({})),
  },
  agents: { list: vi.fn(() => Promise.resolve([])) },
} as unknown as HelpwrenClient;

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

    await user.click(await screen.findByRole("button", { name: "Edit the Bookings collection" }));
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
