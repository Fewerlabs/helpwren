import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("accepts typed text and reports the value", async () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    render(<Input aria-label="Email" onChange={onChange} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Email" });

    await userEvent.type(input, "ada@example.com");

    expect(input).toHaveValue("ada@example.com");
    expect(onChange).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith("ada@example.com");
  });

  it("cannot be typed in when disabled", async () => {
    render(<Input aria-label="Email" disabled />);
    const input = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(input, "ada");
    expect(input).toHaveValue("");
  });

  it("passes the type and invalid state to the input and className to the box", () => {
    render(<Input aria-label="Email" type="email" aria-invalid className="max-w-xs" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeInvalid();
    expect(input.closest("[data-slot='input-shell']")).toHaveClass(
      "max-w-xs",
      "min-h-(--hw-control-height,2.5rem)",
    );
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

  it("renders anything before and after the text", async () => {
    const onClick = vi.fn();
    render(
      <Input
        aria-label="Search"
        prepend={<span>https://</span>}
        append={
          <button type="button" onClick={onClick}>
            Clear
          </button>
        }
      />,
    );
    expect(screen.getByText("https://")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("focuses the input when an addon that is not interactive is clicked", async () => {
    render(<Input aria-label="Address" prepend={<span>https://</span>} />);
    await userEvent.click(screen.getByText("https://"));
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveFocus();
  });
});

describe("Input focus", () => {
  it("shows its focus ring when reached with the keyboard, but not when clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input aria-label="First" />
        <Input aria-label="Second" />
      </>,
    );
    const first = screen.getByRole("textbox", { name: "First" });
    const second = screen.getByRole("textbox", { name: "Second" });
    const shell = (input: HTMLElement) => input.closest("[data-slot='input-shell']");

    await user.click(first);
    expect(first).toHaveFocus();
    expect(shell(first)).not.toHaveAttribute("data-keyboard-focus");

    await user.tab();
    expect(second).toHaveFocus();
    expect(shell(second)).toHaveAttribute("data-keyboard-focus");
    expect(shell(first)).not.toHaveAttribute("data-keyboard-focus");

    await user.click(first);
    expect(shell(first)).not.toHaveAttribute("data-keyboard-focus");
    expect(shell(second)).not.toHaveAttribute("data-keyboard-focus");
  });

  it("changes its edge colour on any focus", () => {
    render(<Input aria-label="Email" />);
    expect(screen.getByRole("textbox").closest("[data-slot='input-shell']")).toHaveClass(
      "has-[input:focus]:border-ring",
    );
  });
});

describe("Input with currency", () => {
  it("groups digits while typing and reports the plain number", async () => {
    const onValueChange = vi.fn();
    render(<Input aria-label="Amount" currency onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Amount" });

    await userEvent.type(input, "1000");
    expect(input).toHaveValue("1,000");
    expect(onValueChange).toHaveBeenLastCalledWith("1000");

    await userEvent.type(input, "000.5");
    expect(input).toHaveValue("1,000,000.5");
    expect(onValueChange).toHaveBeenLastCalledWith("1000000.5");
  });

  it("ignores characters that are not part of a number", async () => {
    render(<Input aria-label="Amount" currency />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    await userEvent.type(input, "12a3b4");
    expect(input).toHaveValue("1,234");
  });

  it("formats a default value given as a number", () => {
    render(<Input aria-label="Amount" currency defaultValue={2500000} />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("2,500,000");
  });

  it("stays in step with a controlled numeric value, without losing a decimal point being typed", async () => {
    function Controlled() {
      const [amount, setAmount] = useState(1000);
      return (
        <>
          <Input
            aria-label="Amount"
            currency
            value={amount}
            onValueChange={(raw) => {
              setAmount(Number(raw));
            }}
          />
          <button
            type="button"
            onClick={() => {
              setAmount(42);
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input).toHaveValue("1,000");

    await userEvent.type(input, ".5");
    expect(input).toHaveValue("1,000.5");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input).toHaveValue("42");
  });

  it("submits the plain number with a form, not the formatted text", () => {
    const { container } = render(
      <form>
        <Input aria-label="Amount" name="amount" currency defaultValue="1234.5" />
      </form>,
    );
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(new FormData(form ?? undefined).get("amount")).toBe("1234.5");
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("1,234.5");
  });

  it("accepts options for decimals and locale", async () => {
    render(<Input aria-label="Betrag" currency={{ locale: "de-DE", decimals: 2 }} />);
    const input = screen.getByRole("textbox", { name: "Betrag" });
    await userEvent.type(input, "1234,567");
    expect(input).toHaveValue("1.234,56");
  });
});

describe("Input with a custom formatter", () => {
  it("shows the formatted text and reports the raw value", async () => {
    const onValueChange = vi.fn();
    render(
      <Input
        aria-label="Reference"
        onValueChange={onValueChange}
        formatter={{
          parse: (display) => display.replace(/\D/g, "").slice(0, 8),
          format: (raw) => raw.replace(/(\d{4})(?=\d)/g, "$1 "),
        }}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Reference" });
    await userEvent.type(input, "12345678999");
    expect(input).toHaveValue("1234 5678");
    expect(onValueChange).toHaveBeenLastCalledWith("12345678");
  });
});
