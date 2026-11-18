import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./icon";
import { iconNames } from "./registry";

describe("Icon", () => {
  it.each(iconNames)("renders the registered icon %s", (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.childElementCount).toBeGreaterThan(0);
  });

  it("is decorative by default: hidden from assistive technology and not focusable", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("is exposed as an image with its label when one is given", () => {
    render(<Icon name="trash" label="Delete conversation" />);
    const icon = screen.getByRole("img", { name: "Delete conversation" });
    expect(icon).not.toHaveAttribute("aria-hidden");
  });

  it("follows the surrounding text by default", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "1em");
    expect(svg).toHaveAttribute("height", "1em");
    expect(svg).toHaveAttribute("fill", "currentColor");
  });

  it("merges className and forwards other props and the ref", () => {
    let node: SVGSVGElement | null = null;
    render(
      <Icon
        name="check"
        className="text-moss size-5"
        data-testid="icon"
        ref={(element) => {
          node = element;
        }}
      />,
    );
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveClass("shrink-0", "size-5", "text-moss");
    expect(node).toBe(icon);
  });

  it("mirrors the icon when asked", () => {
    const { container } = render(<Icon name="arrow-right" mirrored />);
    expect(container.querySelector("svg")).toHaveAttribute("transform", "scale(-1, 1)");
  });
});
