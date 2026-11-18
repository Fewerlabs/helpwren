import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./logo";
import { wrenScenes } from "./scenes";
import { Wren } from "./wren";

describe("Wren", () => {
  it.each(wrenScenes)("renders the %s scene as a described image", (scene) => {
    render(<Wren scene={scene} />);
    const image = screen.getByRole("img");
    expect(image).toHaveAccessibleName(/wren/i);
    expect(image).toHaveAttribute("data-scene", scene);
    expect(image.querySelectorAll("path").length).toBeGreaterThan(3);
  });

  it("draws ink with the text colour and the accents with tokens, never fixed hex values", () => {
    const { container } = render(
      <>
        {wrenScenes.map((scene) => (
          <Wren key={scene} scene={scene} />
        ))}
      </>,
    );
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}/i);
    expect(container.innerHTML).toContain("var(--moss)");
    expect(container.innerHTML).toContain("var(--pen)");
    expect(container.innerHTML).toContain("var(--highlighter)");
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("stroke", "currentColor");
  });

  it("animates by default and can be still", () => {
    const { rerender } = render(<Wren scene="conversations" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-animate");
    rerender(<Wren scene="conversations" animate={false} />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-animate");
  });

  it("can be relabelled, or hidden when decorative", () => {
    const { rerender, container } = render(<Wren scene="self-hosted" label="Your own server" />);
    expect(screen.getByRole("img", { name: "Your own server" })).toBeInTheDocument();
    rerender(<Wren scene="self-hosted" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives each illustration its own filter", () => {
    const { container } = render(
      <>
        <Wren scene="plugs-in" />
        <Wren scene="help-articles" />
      </>,
    );
    const ids = [...container.querySelectorAll("filter")].map((filter) => filter.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`g[filter="url(#${id})"]`)).not.toBeNull();
    }
  });

  it.each(wrenScenes)("can leave the wren out of the %s scene", (scene) => {
    const { container } = render(<Wren scene={scene} decorative bird={false} />);
    expect(container.querySelector("[data-slot='wren']")).toHaveAttribute("data-bird", "off");
    // The stylesheet hides this group; what is left must still be a drawing.
    const birds = container.querySelectorAll(".hw-bird");
    expect(birds.length).toBeGreaterThan(0);
    const inBird = [...birds].reduce((sum, bird) => sum + bird.querySelectorAll("path").length, 0);
    expect(container.querySelectorAll("path").length).toBeGreaterThan(inBird);
  });

  it("gives every scene its own description", () => {
    const { container } = render(
      <>
        {wrenScenes.map((scene) => (
          <Wren key={scene} scene={scene} />
        ))}
      </>,
    );
    const labels = [...container.querySelectorAll("svg")].map((svg) =>
      svg.getAttribute("aria-label"),
    );
    expect(new Set(labels).size).toBe(wrenScenes.length);
  });
});

describe("Logo", () => {
  it("is an image called Helpwren", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "Helpwren" })).toBeInTheDocument();
  });

  it("shows the wordmark in the lockup", () => {
    render(<Logo variant="lockup" />);
    expect(screen.getByRole("img", { name: "Helpwren" })).toHaveTextContent("Helpwren");
  });

  it("drops the eye at the smallest size and keeps it when larger", () => {
    const { container, rerender } = render(<Logo size={16} />);
    expect(container.querySelector("circle")).toBeNull();
    rerender(<Logo size={56} />);
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("thickens the line as it shrinks", () => {
    const { container, rerender } = render(<Logo size={132} />);
    const large = Number(container.querySelector("svg")?.getAttribute("stroke-width"));
    rerender(<Logo size={16} />);
    const small = Number(container.querySelector("svg")?.getAttribute("stroke-width"));
    expect(small).toBeGreaterThan(large);
  });

  it("is hidden from screen readers when the label is empty", () => {
    const { container } = render(<Logo label="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
