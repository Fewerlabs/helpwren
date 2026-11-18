import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kbd } from "./kbd";

describe("Kbd", () => {
  it("renders a kbd element in the monospace font and merges className", () => {
    render(<Kbd className="ml-2">⌘K</Kbd>);
    const key = screen.getByText("⌘K");
    expect(key.tagName).toBe("KBD");
    expect(key).toHaveClass("font-mono", "ml-2");
  });
});
