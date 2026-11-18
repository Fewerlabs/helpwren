import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is announced as a status called Loading by default", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("uses a custom label and merges className", () => {
    render(<Spinner label="Sending message" className="size-6" />);
    const spinner = screen.getByRole("status", { name: "Sending message" });
    expect(spinner).toHaveClass("size-6", "animate-spin");
    expect(spinner).not.toHaveClass("size-4");
  });
});
