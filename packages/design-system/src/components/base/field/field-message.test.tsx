import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError, FieldHint } from "./field-message";

describe("FieldHint", () => {
  it("renders small secondary text that a control can point at", () => {
    render(<FieldHint id="hint">One domain per line.</FieldHint>);
    const hint = screen.getByText("One domain per line.");
    expect(hint).toHaveAttribute("id", "hint");
    expect(hint).toHaveClass("text-xs", "text-muted-foreground");
  });
});

describe("FieldError", () => {
  it("announces its message as an alert, in small text", () => {
    render(<FieldError>Enter a domain.</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a domain.");
    expect(screen.getByRole("alert")).toHaveClass("text-xs", "text-destructive");
  });

  it("renders nothing when there is no message", () => {
    const { container } = render(<FieldError>{""}</FieldError>);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
