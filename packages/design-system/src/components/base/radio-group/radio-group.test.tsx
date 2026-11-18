import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Radio, RadioGroup } from "./radio-group";

function Priority({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <RadioGroup
      defaultValue="normal"
      aria-label="Priority"
      {...(onValueChange ? { onValueChange } : {})}
    >
      <Radio value="low" aria-label="Low" />
      <Radio value="normal" aria-label="Normal" />
      <Radio value="high" aria-label="High" />
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("allows exactly one choice", async () => {
    const onValueChange = vi.fn();
    render(<Priority onValueChange={onValueChange} />);

    expect(screen.getByRole("radiogroup", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "High" }));

    expect(screen.getByRole("radio", { name: "High" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Normal" })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("high");
  });

  it("is one tab stop, and the arrow keys move between its options", async () => {
    const user = userEvent.setup();
    render(<Priority />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: "High" })).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Low" })).toHaveFocus();
  });
});
