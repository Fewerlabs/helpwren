import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Example() {
  return (
    <Tabs defaultValue="chat">
      <TabsList aria-label="Conversation type">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="tickets">Tickets</TabsTrigger>
        <TabsTrigger value="archived" disabled>
          Archived
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat">Three open chats.</TabsContent>
      <TabsContent value="tickets">One ticket.</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows the panel of the selected tab", async () => {
    render(<Example />);
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Three open chats.");

    await userEvent.click(screen.getByRole("tab", { name: "Tickets" }));

    expect(screen.getByRole("tab", { name: "Tickets" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("One ticket.");
  });

  it("moves between tabs with the arrow keys, skipping disabled ones", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Tickets" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveFocus();
  });

  it("names the tab list", () => {
    render(<Example />);
    expect(screen.getByRole("tablist", { name: "Conversation type" })).toBeInTheDocument();
  });

  it("draws one indicator behind the active tab instead of filling the tab itself", () => {
    const { container } = render(<Example />);
    expect(container.querySelectorAll("[data-slot='tabs-indicator']")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveClass("data-active:bg-transparent");
  });

  it("scrolls the chosen tab to the centre when the row is wider than its box", async () => {
    render(<Example />);
    const list = screen.getByRole("tablist");
    const tickets = screen.getByRole("tab", { name: "Tickets" });
    // jsdom does no layout, so describe a 200px box holding 600px of tabs.
    Object.defineProperty(list, "clientWidth", { value: 200 });
    Object.defineProperty(list, "scrollWidth", { value: 600 });
    Object.defineProperty(tickets, "offsetLeft", { value: 300 });
    Object.defineProperty(tickets, "offsetWidth", { value: 100 });
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;

    await userEvent.click(tickets);

    await vi.waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ left: 250, behavior: "smooth" });
    });
  });
});
