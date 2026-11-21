import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("hides what is typed until asked to show it", async () => {
    const onValueChange = vi.fn();
    render(<PasswordInput aria-label="Password" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");

    await userEvent.type(input, "hunter22");
    expect(onValueChange).toHaveBeenLastCalledWith("hunter22");

    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("asks a password manager to save a new password", () => {
    render(<PasswordInput aria-label="New password" autoComplete="new-password" />);
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
  });
});
