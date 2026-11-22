import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectionBar } from "./selection-bar";

describe("SelectionBar", () => {
  it("says how many are selected, with destructive actions last, and clears", async () => {
    const publish = vi.fn();
    const clear = vi.fn();
    render(
      <SelectionBar
        count={3}
        noun={{ one: "article", other: "articles" }}
        onClear={clear}
        actions={[
          { label: "Delete", icon: "trash", destructive: true, onSelect: vi.fn() },
          { label: "Publish", onSelect: publish },
        ]}
      />,
    );

    const bar = screen.getByRole("toolbar", { name: "Selected rows" });
    expect(bar).toHaveTextContent("3 articles selected");
    expect(
      within(bar)
        .getAllByRole("button")
        .map((button) => button.textContent || button.getAttribute("aria-label")),
    ).toEqual(["Publish", "Delete", "Clear selection"]);

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(publish).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it("offers an action's choices in a menu", async () => {
    const move = vi.fn();
    render(
      <SelectionBar
        count={1}
        onClear={vi.fn()}
        actions={[{ label: "Move to", choices: [{ label: "Bookings", onSelect: move }] }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Bookings" }));
    expect(move).toHaveBeenCalledOnce();
  });

  it("holds its actions while one runs, and is not drawn with nothing selected", () => {
    const { rerender } = render(
      <SelectionBar count={2} busy onClear={vi.fn()} actions={[{ label: "Publish" }]} />,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    rerender(<SelectionBar count={0} onClear={vi.fn()} actions={[{ label: "Publish" }]} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });
});
