import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Slider } from "./slider";

describe("Slider", () => {
  it("shows its value, formatted, and reports a new one as a number", () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        aria-label="From the side"
        value={20}
        max={80}
        formatValue={(value) => `${value}px`}
        onValueChange={onValueChange}
      />,
    );
    const slider = screen.getByRole("slider", { name: "From the side" });
    expect(slider).toHaveValue("20");
    expect(slider).toHaveAttribute("aria-valuetext", "20px");
    expect(screen.getByText("20px")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "32" } });
    expect(onValueChange).toHaveBeenCalledWith(32);
  });

  it("can be turned off", () => {
    render(<Slider aria-label="Size" value={1} onValueChange={vi.fn()} disabled />);
    expect(screen.getByRole("slider", { name: "Size" })).toBeDisabled();
  });
});
