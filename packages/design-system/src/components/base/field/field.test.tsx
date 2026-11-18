import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "../input/input";
import { Field } from "./field";

describe("Field", () => {
  it("connects the label to the control", () => {
    render(
      <Field label="Allowed domain">
        <Input />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Allowed domain" })).toBeInTheDocument();
  });

  it("describes the control with its hint", () => {
    render(
      <Field label="Allowed domain" hint="One domain per line.">
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Allowed domain" });
    expect(input).toHaveAccessibleDescription("One domain per line.");
    expect(input).not.toBeInvalid();
  });

  it("marks the control invalid and announces the error", () => {
    render(
      <Field label="Allowed domain" hint="One domain per line." error="Enter a domain.">
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Allowed domain" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("One domain per line. Enter a domain.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a domain.");
  });

  it("marks a required control without adding the asterisk to its name", () => {
    render(
      <Field label="Allowed domain" required>
        <Input />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Allowed domain" })).toBeRequired();
  });

  it("uses a given id for the control", () => {
    render(
      <Field label="Allowed domain" id="domain">
        <Input />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: "Allowed domain" })).toHaveAttribute("id", "domain");
  });
});
