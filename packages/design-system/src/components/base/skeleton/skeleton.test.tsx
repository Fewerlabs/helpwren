import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology and takes its shape from className", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-32" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("h-4", "w-32");
  });
});
