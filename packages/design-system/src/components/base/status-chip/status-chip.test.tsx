import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { statusNames } from "../../../tokens/tokens";
import { StatusChip } from "./status-chip";

describe("StatusChip", () => {
  it.each(statusNames)("shows the %s status as a word, never as colour alone", (status) => {
    render(<StatusChip status={status} />);
    const chip = screen.getByText(new RegExp(`^${status}$`, "i"));
    expect(chip).toHaveAttribute("data-status", status);
    expect(chip).toHaveClass(`text-status-${status}`, `bg-status-${status}-surface`);
  });

  it("uses custom wording when given children", () => {
    render(<StatusChip status="waiting">Waiting on you</StatusChip>);
    expect(screen.getByText("Waiting on you")).toHaveAttribute("data-status", "waiting");
    expect(screen.queryByText("Waiting")).not.toBeInTheDocument();
  });

  it("hides the decorative dot from assistive technology", () => {
    const { container } = render(<StatusChip status="open" />);
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
