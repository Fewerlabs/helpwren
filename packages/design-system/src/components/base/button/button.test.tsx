import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("is a button of type button by default, so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when pressed with the mouse or the keyboard", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("does not respond when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("when loading, is busy, cannot be pressed and shows a spinner", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Save/ });

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("records its variant and size, and merges className", () => {
    render(
      <Button variant="destructive" size="sm" className="w-full">
        Delete
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("data-variant", "destructive");
    expect(button).toHaveAttribute("data-size", "sm");
    expect(button).toHaveClass("w-full", "h-9");
    expect(button).not.toHaveClass("h-11");
  });

  it("takes its name from aria-label when it only contains an icon", () => {
    render(
      <Button size="icon" aria-label="Attach a file">
        <svg aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Attach a file" })).toHaveClass("size-11");
  });

  it("renders its child with button styles when asChild is set", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/help">Help center</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Help center" });
    expect(link).toHaveAttribute("href", "/help");
    expect(link).toHaveAttribute("data-variant", "secondary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("forwards its ref to the button element", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(element) => {
          node = element;
        }}
      >
        Save
      </Button>,
    );
    expect(node).toBe(screen.getByRole("button", { name: "Save" }));
  });
});
