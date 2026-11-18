import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Expandable } from "./expandable";

describe("Expandable", () => {
  it("collapses to a zero-sized grid track and makes its content inert when closed", () => {
    render(
      <Expandable open={false} data-testid="panel">
        <button type="button">Inside</button>
      </Expandable>,
    );
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("data-state", "closed");
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveClass("grid", "grid-rows-[0fr]", "opacity-0");
  });

  it("expands to a full track and is interactive when open", () => {
    render(
      <Expandable open data-testid="panel">
        <button type="button">Inside</button>
      </Expandable>,
    );
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("data-state", "open");
    expect(panel).not.toHaveAttribute("inert");
    expect(panel).toHaveClass("grid-rows-[1fr]");
    expect(panel).not.toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
  });

  it("animates columns when horizontal", () => {
    render(<Expandable open={false} orientation="horizontal" data-testid="panel" />);
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveClass("grid-cols-[0fr]");
    expect(panel).not.toHaveClass("grid-rows-[0fr]");
  });

  it("takes its timing from props and can skip the fade", () => {
    render(
      <Expandable open={false} duration={400} easing="linear" fade={false} data-testid="panel" />,
    );
    const panel = screen.getByTestId("panel");
    expect(panel.style.transitionDuration).toBe("400ms");
    expect(panel.style.transitionTimingFunction).toBe("linear");
    expect(panel).not.toHaveClass("opacity-0");
  });

  it("merges className on the outer and inner elements", () => {
    render(
      <Expandable open className="mt-2" contentClassName="px-4" data-testid="panel">
        Content
      </Expandable>,
    );
    expect(screen.getByTestId("panel")).toHaveClass("mt-2");
    expect(screen.getByText("Content")).toHaveClass("px-4", "overflow-hidden");
  });
});
