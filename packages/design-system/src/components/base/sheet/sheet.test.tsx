import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "../button/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function Example() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Contact details</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Ada Lovelace</SheetTitle>
          <SheetDescription>Customer since March.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens from its trigger as a named dialog on the chosen side", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Contact details" }));

    const sheet = screen.getByRole("dialog", { name: "Ada Lovelace" });
    expect(sheet).toHaveAccessibleDescription("Customer since March.");
    expect(sheet).toHaveAttribute("data-side", "left");
  });

  it("closes with its close button and with Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Contact details" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
