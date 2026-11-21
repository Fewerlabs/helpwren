import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActionMenu } from "./action-menu";

describe("ActionMenu", () => {
  it("names its button for the row, and runs the chosen action", async () => {
    const copy = vi.fn();
    const deactivate = vi.fn();
    render(
      <ActionMenu
        target="Janet Agada"
        items={[
          { label: "Deactivate", icon: "user-minus", destructive: true, onSelect: deactivate },
          { label: "Copy invite link", icon: "link", onSelect: copy },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "More actions for Janet Agada" }));
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    // Destructive actions come last, whatever order they were given in.
    expect(items).toEqual(["Copy invite link", "Deactivate"]);

    await userEvent.click(screen.getByRole("menuitem", { name: "Copy invite link" }));
    expect(copy).toHaveBeenCalledOnce();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it("does not run a disabled action", async () => {
    const send = vi.fn();
    render(
      <ActionMenu
        target="Janet"
        items={[{ label: "Send invite again", disabled: true, onSelect: send }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "More actions for Janet" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Send invite again" }));
    expect(send).not.toHaveBeenCalled();
  });
});
