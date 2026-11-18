import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppLoader } from "./app-loader";

describe("AppLoader", () => {
  it("says what is loading, as a status that is announced", () => {
    render(<AppLoader label="Opening the article" />);
    expect(screen.getByRole("status", { name: "Opening the article" })).toHaveTextContent(
      "Opening the article…",
    );
  });

  it("says Loading when it is not told what", () => {
    render(<AppLoader />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("draws the wren, and leaves it out on someone else's brand", () => {
    const { container, rerender } = render(<AppLoader />);
    expect(container.querySelector(".hw-loader-hop")).not.toBeNull();
    // The drawing is decoration: the words carry the meaning.
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(<AppLoader bird={false} />);
    expect(container.querySelector(".hw-loader-hop")).toBeNull();
    expect(container.querySelectorAll(".hw-loader-line")).toHaveLength(2);
  });

  it("fills its container unless told not to", () => {
    const { rerender } = render(<AppLoader />);
    expect(screen.getByRole("status")).toHaveClass("size-full");
    rerender(<AppLoader fill={false} />);
    expect(screen.getByRole("status")).not.toHaveClass("size-full");
  });
});
