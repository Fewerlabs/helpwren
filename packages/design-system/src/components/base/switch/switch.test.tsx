import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("turns on and off with a click and with the keyboard", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch aria-label="Email notifications" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Email notifications" });

    expect(control).not.toBeChecked();
    await user.click(control);
    expect(control).toBeChecked();
    await user.keyboard("{Enter}");
    expect(control).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true);
    expect(onCheckedChange).toHaveBeenNthCalledWith(2, false);
  });

  it("does not change when disabled", async () => {
    render(<Switch aria-label="Email notifications" disabled defaultChecked />);
    const control = screen.getByRole("switch", { name: "Email notifications" });
    await userEvent.click(control);
    expect(control).toBeChecked();
  });
});
