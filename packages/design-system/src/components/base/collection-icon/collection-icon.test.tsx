import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CollectionIcon, iconUrl } from "./collection-icon";

describe("CollectionIcon", () => {
  it("is drawn from the icon's file, as a mask over the text colour", () => {
    const { container } = render(<CollectionIcon name="rocket-launch" weight="duotone" />);
    const icon = container.querySelector<HTMLElement>("[data-slot=collection-icon]");
    expect(icon?.style.maskImage).toBe('url("/api/icons/duotone/rocket-launch.svg")');
    expect(icon).toHaveClass("bg-current");
  });

  it("is decorative unless it has a label", () => {
    const { container } = render(<CollectionIcon name="star" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    render(<CollectionIcon name="star" label="Favourites" />);
    expect(screen.getByRole("img", { name: "Favourites" })).toBeInTheDocument();
  });

  it("never asks for a name that could not be an icon's", () => {
    expect(iconUrl("../../etc/passwd")).toBe("/api/icons/regular/book-open.svg");
    expect(iconUrl("Rocket")).toBe("/api/icons/regular/book-open.svg");
    expect(iconUrl("rocket", "bold")).toBe("/api/icons/bold/rocket.svg");
  });

  it("asks for the file under another route when given one", () => {
    expect(iconUrl("rocket", "bold", "/help/_icons")).toBe("/help/_icons/bold/rocket.svg");
  });
});
