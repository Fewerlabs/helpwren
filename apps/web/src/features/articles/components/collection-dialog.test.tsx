import { type Collection, type HelpwrenClient } from "@helpwren/core";
import { Button, ConfirmProvider, Toaster, TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { CollectionDialog } from "./collection-dialog";

// The action runs on the server and the router belongs to Next; neither exists in a unit test.
vi.mock("../actions", () => ({ refreshHelpCenter: vi.fn(() => Promise.resolve()) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const collection = (overrides: Partial<Collection>): Collection => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Bookings",
  slug: "bookings",
  description: "Change or cancel a booking.",
  icon: "calendar",
  position: 1,
  updatedAt: "2026-11-20T10:00:00Z",
  articleCount: 0,
  ...overrides,
});
const bookings = collection({});

const collections = { create: vi.fn(), update: vi.fn(), reorder: vi.fn(), remove: vi.fn() };
const client = { collections } as unknown as HelpwrenClient;

/** A page with a New collection button and an Edit button, as the help center's has. */
function Page() {
  const [editing, setEditing] = useState<{ open: boolean; collection: Collection | null }>({
    open: false,
    collection: null,
  });
  return (
    <>
      <Button
        onClick={() => {
          setEditing({ open: true, collection: null });
        }}
      >
        New collection
      </Button>
      <Button
        onClick={() => {
          setEditing({ open: true, collection: bookings });
        }}
      >
        Edit Bookings
      </Button>
      <CollectionDialog
        collection={editing.collection}
        collections={[bookings]}
        open={editing.open}
        onOpenChange={(open) => {
          setEditing((current) => ({ ...current, open }));
        }}
      />
    </>
  );
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HelpwrenProvider getClient={() => client}>
        <TooltipProvider>
          <ConfirmProvider>
            <Page />
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </HelpwrenProvider>
    </QueryClientProvider>,
  );
}

describe("the collection form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collections.create.mockImplementation((values: { name: string }) =>
      Promise.resolve({ ok: true, collection: collection({ ...values, slug: "made" }) }),
    );
    collections.update.mockResolvedValue({ ok: true, collection: bookings });
  });

  it("starts empty for each new collection, whatever the last one was called", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Bookings");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Change a booking.");
    await user.click(screen.getByRole("button", { name: "Add collection" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "New collection" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("");
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Account and payments");
    await user.click(screen.getByRole("button", { name: "Add collection" }));

    await waitFor(() => {
      expect(collections.create).toHaveBeenCalledTimes(2);
    });
    expect(collections.create).toHaveBeenLastCalledWith({
      name: "Account and payments",
      description: "",
      icon: "book-open",
    });
  });

  it("drops what was typed into a form closed without saving", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Half a thought");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "New collection" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  });

  it("shows what is saved when changing a collection, and nothing of it for a new one", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Bookings" }));
    expect(screen.getByRole("dialog", { name: "Edit collection" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Bookings");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Change or cancel a booking.",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "New collection" }));
    expect(screen.getByRole("dialog", { name: "New collection" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
  });
});
