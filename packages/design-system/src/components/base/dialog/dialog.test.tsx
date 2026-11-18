import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "../button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Example({ hideClose = false }: { hideClose?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Delete conversation</Button>
      </DialogTrigger>
      <DialogContent hideClose={hideClose} closeLabel="Close dialog">
        <DialogHeader>
          <DialogTitle>Delete this conversation?</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens from its trigger, named and described by its title and description", async () => {
    render(<Example />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete conversation" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this conversation?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("closes with its labelled close button and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Delete conversation" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes with the Escape key", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Delete conversation" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("can hide the close button", async () => {
    render(<Example hideClose />);
    await userEvent.click(screen.getByRole("button", { name: "Delete conversation" }));
    expect(screen.queryByRole("button", { name: "Close dialog" })).not.toBeInTheDocument();
  });
});
