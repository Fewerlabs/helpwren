import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RowLink } from "./row-link";

describe("RowLink", () => {
  it("is a button that underlines the name alone on hover and focus", async () => {
    const onClick = vi.fn();
    render(
      <RowLink leading={<span>VE</span>} onClick={onClick}>
        Visitor E71E
      </RowLink>,
    );
    const button = screen.getByRole("button", { name: /Visitor E71E/ });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("cursor-pointer", "group");
    expect(screen.getByText("Visitor E71E")).toHaveClass(
      "group-hover:underline",
      "group-focus-visible:underline",
      "underline-offset-4",
      "decoration-muted-foreground/40",
    );
    expect(screen.getByText("VE")).not.toHaveClass("group-hover:underline");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });

  it("draws the link it is given, with the link's content as the name", () => {
    render(
      <RowLink asChild description="How refunds work">
        <a href="/articles/1" className="custom">
          Refunds
        </a>
      </RowLink>,
    );
    const link = screen.getByRole("link", { name: /^Refunds/ });
    expect(link).toHaveAttribute("href", "/articles/1");
    expect(link).toHaveClass("custom", "cursor-pointer");
    expect(link).not.toHaveAttribute("type");
    expect(screen.getByText("Refunds")).toHaveClass("group-hover:underline");
    expect(screen.getByText("How refunds work")).toBeInTheDocument();
  });

  it("leaves out an empty description", () => {
    const { container } = render(<RowLink description="">Refunds</RowLink>);
    expect(container.querySelectorAll("span.text-xs")).toHaveLength(0);
  });
});
