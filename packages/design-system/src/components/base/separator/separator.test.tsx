import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("is decorative by default, so it is not announced", () => {
    render(<Separator data-testid="separator" />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.getByTestId("separator")).toHaveClass("bg-rule");
  });

  it("is announced with its orientation when it carries meaning", () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});
