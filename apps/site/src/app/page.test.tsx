import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type * as Github from "@/lib/github";

import Home from "./page";

vi.mock("@/lib/github", async (original) => ({
  ...(await original<typeof Github>()),
  getStarCount: () => Promise.resolve(null),
}));

async function renderPage() {
  render(await Home());
}

describe("the landing page", () => {
  it("has one main heading and a labelled section for every entry", async () => {
    await renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const main = screen.getByRole("main");
    const sections = main.querySelectorAll("section");
    expect(sections.length).toBe(9);
    for (const section of sections) {
      const labelledBy = section.getAttribute("aria-labelledby");
      expect(labelledBy && document.getElementById(labelledBy)).toBeTruthy();
    }
  });

  it("gives every entry a perch or a waypoint for the wren", async () => {
    await renderPage();
    const marks = document.querySelectorAll("[data-wren-perch], [data-wren-waypoint]");
    expect([...marks].map((mark) => mark.getAttribute("data-wren-perch") ?? "waypoint")).toEqual(
      expect.arrayContaining(["first-sighting", "habitat", "nest", "wild", "home-range", "footer"]),
    );
  });

  it("hides the drawings and the still wrens from assistive technology", async () => {
    await renderPage();
    for (const perch of document.querySelectorAll("[data-wren-perch]")) {
      expect(perch).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("links to the install steps and the repository from the first screen", async () => {
    await renderPage();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).not.toBeNull();
    if (!hero) return;
    expect(within(hero).getByRole("link", { name: /install helpwren/i })).toHaveAttribute(
      "href",
      expect.stringContaining("github.com/Fewerlabs/helpwren"),
    );
    expect(within(hero).getByRole("link", { name: /view on github/i })).toBeInTheDocument();
  });

  it("makes no claim about features that are not built", async () => {
    await renderPage();
    const text = document.body.textContent.toLowerCase();
    for (const phrase of ["headless", "one command", "10 min", "ten minutes", "ai answers"]) {
      expect(text).not.toContain(phrase);
    }
  });
});
