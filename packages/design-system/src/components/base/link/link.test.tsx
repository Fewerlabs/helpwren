import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Link } from "./link";

describe("Link", () => {
  it("renders an underlined link to its destination", () => {
    render(<Link href="/help/refunds">How refunds work</Link>);
    const link = screen.getByRole("link", { name: "How refunds work" });
    expect(link).toHaveAttribute("href", "/help/refunds");
    expect(link).toHaveClass("underline");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens an external link in a new tab, safely, and says so", () => {
    render(
      <Link href="https://example.com" external>
        Example
      </Link>,
    );
    const link = screen.getByRole("link", { name: /^Example\s*\(opens in a new tab\)$/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("styles its child instead of rendering an anchor when asChild is set", () => {
    render(
      <Link asChild className="font-medium">
        <a href="/inbox" data-router-link="">
          Inbox
        </a>
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Inbox" });
    expect(link).toHaveAttribute("data-router-link");
    expect(link).toHaveClass("text-biro", "font-medium");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
