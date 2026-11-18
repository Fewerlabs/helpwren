import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, initials } from "./avatar";

describe("initials", () => {
  it.each([
    ["Ada Lovelace", "AL"],
    ["Acme", "A"],
    ["  ada   king  lovelace ", "AL"],
    ["", ""],
  ])("turns %j into %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("Avatar", () => {
  it("is announced by the person's name and shows their initials", () => {
    render(<Avatar name="Ada Lovelace" />);
    const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
    expect(avatar).toHaveTextContent("AL");
  });

  it("falls back to initials until an image has loaded", () => {
    render(<Avatar name="Grace Hopper" src="https://example.com/grace.png" />);
    expect(screen.getByRole("img", { name: "Grace Hopper" })).toHaveTextContent("GH");
  });

  it("applies the size and merges className", () => {
    render(<Avatar name="Ada Lovelace" size="lg" className="ring-2" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveClass("size-12", "ring-2");
  });
});
