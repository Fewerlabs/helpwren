import { TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { resetExampleStore } from "../store/example-store";
import { CannedReplies } from "./canned-replies";

function renderFeature() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <CannedReplies />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetExampleStore();
});

describe("CannedReplies", () => {
  it("loads the first page of replies and can load more", async () => {
    renderFeature();
    const list = await screen.findByRole("list", { name: "Canned replies" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("Greeting")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await within(list).findByText("Away")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
  });

  it("filters the list as you search, and says when nothing matches", async () => {
    const user = userEvent.setup();
    renderFeature();
    await screen.findByText("Greeting");
    const search = screen.getByRole("searchbox", { name: "Search canned replies" });

    await user.type(search, "refund");
    expect(await screen.findByText("Refund started")).toBeInTheDocument();
    await screen.findByText("Duplicate charge");
    expect(screen.queryByText("Greeting")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "zzz");
    expect(await screen.findByText("No replies match that search.")).toBeInTheDocument();
  });

  it("shows the schema's messages and does not save an incomplete reply", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(screen.getByRole("button", { name: "New reply" }));
    const dialog = await screen.findByRole("dialog", { name: "New canned reply" });

    await user.click(within(dialog).getByRole("button", { name: "Save reply" }));

    expect(await within(dialog).findByText("Give the reply a title.")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Shortcut" })).toBeInvalid();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("puts a taken shortcut's error on the shortcut field", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(screen.getByRole("button", { name: "New reply" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByRole("textbox", { name: "Title" }), "Hi again");
    await user.type(within(dialog).getByRole("textbox", { name: "Shortcut" }), "hello");
    await user.type(within(dialog).getByRole("textbox", { name: "Reply" }), "Hello again.");
    await user.click(within(dialog).getByRole("button", { name: "Save reply" }));

    const shortcut = within(dialog).getByRole("textbox", { name: "Shortcut" });
    expect(
      await within(dialog).findByText("The shortcut /hello is already in use."),
    ).toBeInTheDocument();
    expect(shortcut).toBeInvalid();
  });

  it("saves a new reply, closes the dialog and shows it at the top of the list", async () => {
    const user = userEvent.setup();
    renderFeature();
    await screen.findByText("Greeting");
    await user.click(screen.getByRole("button", { name: "New reply" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByRole("textbox", { name: "Title" }), "Thanks for waiting");
    await user.type(within(dialog).getByRole("textbox", { name: "Shortcut" }), "patience");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Reply" }),
      "Thanks for your patience.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save reply" }));

    const list = await screen.findByRole("list", { name: "Canned replies" });
    expect(await within(list).findByText("Thanks for waiting")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("/patience");
  });
});
