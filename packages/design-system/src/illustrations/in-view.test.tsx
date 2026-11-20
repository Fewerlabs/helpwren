import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sketch } from "./sketch";
import { Wren } from "./wren";
import { WrenBird, wrenPoses } from "./wren-bird";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let observed: Callback[] = [];

class FakeObserver {
  constructor(callback: Callback) {
    observed.push(callback);
  }
  observe() {
    // The test calls the callback itself.
  }
  disconnect() {
    // Nothing to release.
  }
}

/** Tells every observer where its drawing is. */
function report(isIntersecting: boolean, intersectionRatio: number) {
  act(() => {
    for (const callback of observed) callback([{ isIntersecting, intersectionRatio }]);
  });
}

beforeEach(() => {
  observed = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("drawing in view", () => {
  it("waits below the screen, draws once in view, and pauses off screen", () => {
    render(<Wren scene="self-hosted" animate="in-view" />);
    const svg = screen.getByRole("img");
    // The server and the first render show the finished drawing.
    report(false, 0);
    expect(svg).toHaveAttribute("data-animate", "waiting");
    expect(svg).toHaveAttribute("data-paused");

    report(true, 0.5);
    expect(svg).toHaveAttribute("data-animate", "");
    expect(svg).not.toHaveAttribute("data-paused");

    report(false, 0);
    expect(svg).toHaveAttribute("data-animate", "");
    expect(svg).toHaveAttribute("data-paused");
  });

  it("does not redraw a drawing already on screen when the page opens; it only lives", () => {
    render(
      <Sketch viewBox="0 0 10 10" label="A line">
        {<path pathLength={1} d="M0 0L10 10" />}
      </Sketch>,
    );
    report(true, 1);
    expect(screen.getByRole("img", { name: "A line" })).toHaveAttribute("data-animate", "idle");
  });

  it("shows the drawing finished when it cannot watch the screen", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Wren scene="welcome" animate="in-view" />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-animate");
  });
});

describe("WrenBird", () => {
  it.each(wrenPoses)("draws the %s pose in the logo's box", (pose) => {
    const { container } = render(<WrenBird pose={pose} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "9 8 56 56");
    expect(svg).toHaveAttribute("data-pose", pose);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(3);
  });

  it("closes its eye when asleep", () => {
    const { container, rerender } = render(<WrenBird pose="perched" />);
    expect(container.querySelector("circle")).not.toBeNull();
    rerender(<WrenBird pose="asleep" />);
    expect(container.querySelector("circle")).toBeNull();
  });

  it("hops when told to react, and can be labelled", () => {
    const { container, rerender } = render(<WrenBird label="The wren" />);
    expect(screen.getByRole("img", { name: "The wren" })).toBeInTheDocument();
    expect(container.querySelector(".hw-react")).toBeNull();
    rerender(<WrenBird label="The wren" react={1} />);
    expect(container.querySelector(".hw-react")).not.toBeNull();
  });
});
