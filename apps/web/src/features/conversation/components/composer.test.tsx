import { type HelpwrenClient, type SavedReply } from "@helpwren/core";
import { TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { Composer } from "./composer";

function reply(title: string, shortcut: string, body: string): SavedReply {
  return {
    id: crypto.randomUUID(),
    title,
    body,
    shortcut,
    visibility: "team",
    ownerId: null,
    createdBy: null,
    createdAt: "2026-11-19T10:00:00Z",
    updatedAt: "2026-11-19T10:00:00Z",
  };
}

const replies = [
  reply("Greeting", "hi", "Hi {contact.first_name}, I'm {agent.first_name} from {brand.name}."),
  reply("Refund policy", "refund", "Refunds take five days."),
];

function renderComposer() {
  const typing = { start: vi.fn(), stop: vi.fn() };
  const client = {
    savedReplies: { list: vi.fn(() => Promise.resolve(replies)) },
    settings: { getPublic: vi.fn(() => Promise.resolve({ brand: { name: "Acme" } })) },
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HelpwrenProvider getClient={() => client as unknown as HelpwrenClient}>
          <Composer
            conversationId="11111111-1111-4111-8111-111111111111"
            variant="card"
            allowNotes
            typing={typing}
            placeholders={{
              contact: { name: "Priya Nair", email: "priya@example.org" },
              agent: { name: "Sam Rivera" },
            }}
          />
        </HelpwrenProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { typing, box: screen.getByRole("textbox", { name: "Your message" }) };
}

describe("saved replies in the reply box", () => {
  it("opens on /, narrows as you type, and puts the filled reply in place of the query", async () => {
    const user = userEvent.setup();
    const { box } = renderComposer();

    await user.type(box, "Hello /");
    expect(await screen.findAllByRole("option")).toHaveLength(2);
    expect(box).toHaveAttribute("aria-autocomplete", "list");

    await user.type(box, "gre");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", options[0]?.id);

    await user.keyboard("{Enter}");
    expect(box).toHaveValue("Hello Hi Priya, I'm Sam from Acme.");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("moves with the arrow keys and closes with Escape", async () => {
    const user = userEvent.setup();
    const { box } = renderComposer();

    await user.type(box, "/");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Refund policy/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Greeting/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("/");
  });

  it("does not open inside a word or a link", async () => {
    const user = userEvent.setup();
    const { box } = renderComposer();
    await user.type(box, "see example.com/help");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("says a reply is being written, and stops saying so when the box is cleared or left", async () => {
    const user = userEvent.setup();
    const { box, typing } = renderComposer();

    await user.type(box, "On it");
    expect(typing.start).toHaveBeenCalled();
    await user.clear(box);
    expect(typing.stop).toHaveBeenCalled();
  });
});

describe("the visitor's message box", () => {
  function renderBar() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <HelpwrenProvider getClient={() => ({}) as unknown as HelpwrenClient}>
            <Composer conversationId="11111111-1111-4111-8111-111111111111" />
          </HelpwrenProvider>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    return screen.getByRole("textbox", { name: "Your message" });
  }

  it("can send only once something is written", async () => {
    const user = userEvent.setup();
    const box = renderBar();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await user.type(box, "Hello");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });
});
