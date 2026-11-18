import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its text and is neutral by default", () => {
    render(<Badge>billing</Badge>);
    expect(screen.getByText("billing")).toHaveAttribute("data-variant", "neutral");
  });

  it("records the chosen variant and merges className", () => {
    render(
      <Badge variant="outline" className="uppercase">
        ios
      </Badge>,
    );
    const badge = screen.getByText("ios");
    expect(badge).toHaveAttribute("data-variant", "outline");
    expect(badge).toHaveClass("uppercase", "border-line");
  });
});
