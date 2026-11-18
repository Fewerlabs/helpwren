import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("accepts typed text and reports changes", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Email" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Email" });

    await userEvent.type(input, "ada@example.com");

    expect(input).toHaveValue("ada@example.com");
    expect(onChange).toHaveBeenCalled();
  });

  it("cannot be typed in when disabled", async () => {
    render(<Input aria-label="Email" disabled />);
    const input = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(input, "ada");
    expect(input).toHaveValue("");
  });

  it("passes the type and invalid state through, and merges className", () => {
    render(<Input aria-label="Email" type="email" aria-invalid className="max-w-xs" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeInvalid();
    expect(input).toHaveClass("max-w-xs", "h-11");
  });

  it("forwards its ref to the input element", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Input
        aria-label="Email"
        ref={(element) => {
          node = element;
        }}
      />,
    );
    expect(node).toBe(screen.getByRole("textbox", { name: "Email" }));
  });
});
