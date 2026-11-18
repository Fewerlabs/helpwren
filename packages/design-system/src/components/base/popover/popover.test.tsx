import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "../button/button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

function Example() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Snooze</Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Snooze this conversation">
        <button type="button">Four hours</button>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("opens from its trigger and reports that it is expanded", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Snooze" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Snooze this conversation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Four hours" })).toBeInTheDocument();
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Snooze" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
