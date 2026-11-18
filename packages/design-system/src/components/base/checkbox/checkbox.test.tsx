import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles with a click and with the space key", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox aria-label="Ask for email" onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "Ask for email" });

    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true);
    expect(onCheckedChange).toHaveBeenNthCalledWith(2, false);
  });

  it("is toggled by its label", async () => {
    render(
      <>
        <Checkbox id="ask" />
        <label htmlFor="ask">Ask for email</label>
      </>,
    );
    await userEvent.click(screen.getByText("Ask for email"));
    expect(screen.getByRole("checkbox", { name: "Ask for email" })).toBeChecked();
  });

  it("does not toggle when disabled", async () => {
    render(<Checkbox aria-label="Ask for email" disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Ask for email" });
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
