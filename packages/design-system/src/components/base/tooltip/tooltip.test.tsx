import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tooltip, TooltipProvider } from "./tooltip";

function Example() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip content="Copy snippet">
        <button type="button" aria-label="Copy">
          icon
        </button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("is hidden until its child is focused, then describes it", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();

    const button = screen.getByRole("button", { name: "Copy" });
    expect(button).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Copy snippet");
    expect(button).toHaveAccessibleDescription("Copy snippet");
  });

  it("hides again when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
