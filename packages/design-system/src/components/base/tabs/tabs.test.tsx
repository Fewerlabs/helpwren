import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
});
