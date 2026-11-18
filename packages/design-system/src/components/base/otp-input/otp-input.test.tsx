import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { OtpInput } from "./otp-input";

function Code({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <OtpInput
      aria-label="Sign-in code"
      value={value}
      onValueChange={setValue}
      onComplete={onComplete}
    />
  );
}

describe("OtpInput", () => {
  it("is one field with a box for each digit, and keeps only digits", async () => {
    const { container } = render(<Code />);
    const field = screen.getByRole("textbox", { name: "Sign-in code" });
    expect(container.querySelectorAll("[data-slot='otp-input'] > div")).toHaveLength(6);
    expect(field).toHaveAttribute("autocomplete", "one-time-code");

    await userEvent.type(field, "12a 3");
    expect(field).toHaveValue("123");
    expect(container.querySelector("[data-slot='otp-input']")).toHaveTextContent("123");
  });

  it("takes a pasted code whole, and says when the code is complete", async () => {
    const onComplete = vi.fn();
    render(<Code onComplete={onComplete} />);
    const field = screen.getByRole("textbox", { name: "Sign-in code" });

    await userEvent.click(field);
    await userEvent.paste("482 913 77");
    expect(field).toHaveValue("482913");
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("482913");
  });

  it("can be a different length, or turned off", () => {
    const { container } = render(
      <OtpInput aria-label="Code" value="" onValueChange={vi.fn()} length={4} disabled />,
    );
    expect(container.querySelectorAll("[data-slot='otp-input'] > div")).toHaveLength(4);
    expect(screen.getByRole("textbox", { name: "Code" })).toBeDisabled();
  });
});
