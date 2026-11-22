import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

  it("closes once an action that runs nothing is chosen", async () => {
    render(<ActionMenu target="Janet" items={[{ label: "Copy link", onSelect: vi.fn() }]} />);

    await userEvent.click(screen.getByRole("button", { name: "More actions for Janet" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("stays open with a spinner while an action's promise is out, and holds the others", async () => {
    let finish: () => void = () => undefined;
    const publish = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const edit = vi.fn();
    render(
      <ActionMenu
        target="Paying a deposit"
        items={[
          { label: "Publish", icon: "check-circle", onSelect: publish },
          { label: "Edit", icon: "pencil-simple", onSelect: edit },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /More actions/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Publish/ }));

    const running = screen.getByRole("menuitem", { name: /Publish/ });
    expect(running).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Working")).toBeInTheDocument();
    // A second press does not run it twice, the others wait, and Escape leaves it open.
    await userEvent.click(running);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.keyboard("{Escape}");
    expect(publish).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();

    finish();
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("stays open while the caller says an action is loading", async () => {
    let finish: () => void = () => undefined;
    function Row() {
      const [loading, setLoading] = useState(false);
      return (
        <ActionMenu
          target="Janet"
          items={[
            {
              label: "Send invite again",
              loading,
              onSelect: () => {
                setLoading(true);
                finish = () => {
                  setLoading(false);
                };
              },
            },
          ]}
        />
      );
    }
    render(<Row />);

    await userEvent.click(screen.getByRole("button", { name: "More actions for Janet" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Send invite again" }));
    expect(screen.getByRole("menuitem", { name: /Send invite again/ })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    finish();
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("offers an action's choices in a menu of their own", async () => {
    const move = vi.fn();
    render(
      <ActionMenu
        target="Paying a deposit"
        items={[
          {
            label: "Move to",
            icon: "folder",
            choices: [
              { label: "Bookings", onSelect: move },
              { label: "Billing", onSelect: vi.fn() },
            ],
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /More actions/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Move to" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Bookings" }));
    expect(move).toHaveBeenCalledOnce();
  });
});
