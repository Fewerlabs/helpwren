import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinearProgress } from "./linear-progress";

describe("LinearProgress", () => {
  it("is an indeterminate progress bar called Loading by default", () => {
    render(<LinearProgress />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar).toHaveAttribute("data-state", "indeterminate");
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("reports a value when given one, clamped to 0 to 100", () => {
    const { rerender } = render(<LinearProgress value={40} label="Uploading" />);
    const bar = screen.getByRole("progressbar", { name: "Uploading" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");

    rerender(<LinearProgress value={140} label="Uploading" />);
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("merges className", () => {
    render(<LinearProgress className="absolute top-0" />);
    expect(screen.getByRole("progressbar")).toHaveClass("absolute", "top-0", "h-0.5");
  });
});
