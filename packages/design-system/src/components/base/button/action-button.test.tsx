import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../tooltip/tooltip";
import { ActionButton, type ActionButtonProps } from "./action-button";

function renderButton(props: Partial<ActionButtonProps> = {}) {
  const onClick = vi.fn();
  render(
    <TooltipProvider delayDuration={0}>
      <ActionButton icon="user-plus" label="Invite" onClick={onClick} {...props} />
    </TooltipProvider>,
  );
  return onClick;
}

describe("ActionButton", () => {
  it("is named by its label and pressed like any button", async () => {
    const user = userEvent.setup();
    const onClick = renderButton();

    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("takes a fuller name when the label alone would be ambiguous", () => {
    renderButton({ label: "Deactivate", target: "Sam Rivera" });
    expect(screen.getByRole("button", { name: "Deactivate, Sam Rivera" })).toBeInTheDocument();
  });

  it("keeps the label in the page, hidden visually only on a narrow screen", () => {
    renderButton({ collapseBelow: "md" });
    expect(screen.getByText("Invite")).toHaveClass("max-md:sr-only");
    expect(screen.getByRole("button")).toHaveClass("max-md:size-9");
  });

  it("shows the label as a tooltip when focused", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Invite");
  });
});
