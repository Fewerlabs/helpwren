import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Label } from "./label";

describe("Label", () => {
  it("names the control it points at, and focuses it when clicked", async () => {
    render(
      <>
        <Label htmlFor="brand">Brand name</Label>
        <input id="brand" />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Brand name" });
    await userEvent.click(screen.getByText("Brand name"));
    expect(input).toHaveFocus();
  });

  it("merges className", () => {
    render(<Label className="sr-only">Hidden label</Label>);
    expect(screen.getByText("Hidden label")).toHaveClass("sr-only");
  });
});
