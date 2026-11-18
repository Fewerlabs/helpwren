import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChoiceCards } from "./choice-cards";

const options = [
  { value: "right", label: "Bottom right" },
  { value: "left", label: "Bottom left" },
  { value: "top", label: "Top", description: "Not yet", disabled: true },
] as const;

describe("ChoiceCards", () => {
  it("is a group of radio buttons, with the chosen one checked", async () => {
    const onValueChange = vi.fn();
    render(
      <ChoiceCards
        label="Position"
        value="right"
        options={options}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Position" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bottom right" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Bottom left" }));
    expect(onValueChange).toHaveBeenCalledWith("left");
  });

  it("leaves out a choice that cannot be made, and says why", async () => {
    const onValueChange = vi.fn();
    render(
      <ChoiceCards
        label="Position"
        value="right"
        options={options}
        onValueChange={onValueChange}
      />,
    );
    const top = screen.getByRole("radio", { name: /Top/ });
    expect(top).toBeDisabled();
    expect(screen.getByText("Not yet")).toBeInTheDocument();
    await userEvent.click(top);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
