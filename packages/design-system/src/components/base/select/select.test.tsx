import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field } from "../field/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function Assignee({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <Select defaultValue="ada" {...(onValueChange ? { onValueChange } : {})}>
      <SelectTrigger aria-label="Assignee">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ada">Ada Lovelace</SelectItem>
        <SelectItem value="grace">Grace Hopper</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("shows the current value on its trigger", () => {
    render(<Assignee />);
    expect(screen.getByRole("combobox", { name: "Assignee" })).toHaveTextContent("Ada Lovelace");
  });

  it("opens from the keyboard and chooses an option", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Assignee onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Assignee" });

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("option", { name: "Grace Hopper" }));

    expect(onValueChange).toHaveBeenCalledWith("grace");
    expect(trigger).toHaveTextContent("Grace Hopper");
  });

  it("is full width and 40px tall by default, and merges className", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Assignee" className="w-40">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "Assignee" });
    expect(trigger).toHaveClass("w-40", "data-[size=default]:h-10");
    expect(trigger).not.toHaveClass("w-full");
  });

  it("is labelled, described and marked invalid by a Field placed around its trigger", () => {
    render(
      <Select>
        <Field label="Assignee" error="Choose a person.">
          <SelectTrigger>
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
        </Field>
        <SelectContent>
          <SelectItem value="ada">Ada Lovelace</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "Assignee" });
    expect(trigger).toBeInvalid();
    expect(trigger).toHaveAccessibleDescription("Choose a person.");
  });
});
