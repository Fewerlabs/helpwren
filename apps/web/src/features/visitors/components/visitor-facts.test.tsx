import { type Visitor } from "@helpwren/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecentPages, VisitorFacts } from "./visitor-facts";

const now = new Date().toISOString();

const visitor: Visitor = {
  id: "3f9a2c1e-6b7d-4e8f-9a0b-1c2d3e4f5a6b",
  contact: null,
  page: { url: "https://shop.example.com/pricing", title: "Pricing" },
  referrer: null,
  browser: "Firefox",
  os: "Linux",
  device: "desktop",
  language: null,
  timezone: null,
  location: { country: null, region: null, city: null },
  firstSeenAt: now,
  sessionStartedAt: now,
  lastSeenAt: now,
  sessionCount: 3,
  recentPages: [],
  outreach: null,
};

describe("VisitorFacts", () => {
  it("shows what the browser said, and leaves out what it did not", () => {
    render(<VisitorFacts visitor={visitor} />);

    expect(screen.getByText("Firefox on Linux")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pricing/ })).toHaveAttribute(
      "href",
      "https://shop.example.com/pricing",
    );
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByText("Local time")).not.toBeInTheDocument();
    expect(screen.queryByText("Came from")).not.toBeInTheDocument();
  });

  it("says where they are and their time when it is known", () => {
    render(
      <VisitorFacts
        visitor={{
          ...visitor,
          timezone: "Asia/Tokyo",
          location: { country: "JP", region: null, city: "Osaka" },
          referrer: "https://news.example.org/story",
        }}
      />,
    );
    expect(screen.getByText(/Osaka, /)).toBeInTheDocument();
    expect(screen.getByText("(Asia/Tokyo)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /news.example.org\/story/ })).toBeInTheDocument();
  });
});

describe("RecentPages", () => {
  it("lists the pages newest first, by title or address", () => {
    render(
      <RecentPages
        pages={[
          { url: "https://shop.example.com/b", title: "B", at: now },
          { url: "https://shop.example.com/a", title: null, at: now },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("B"),
      expect.stringContaining("shop.example.com/a"),
    ]);
  });
});
