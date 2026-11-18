import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScrollableFocus } from "./scrollable-focus";

function Box({ overflowY }: { overflowY: "auto" | "visible" }) {
  const scrollable = useScrollableFocus<HTMLDivElement>();
  return (
    <div data-testid="box" style={{ overflowY }} {...scrollable}>
      <p>Content</p>
    </div>
  );
}

// jsdom has no layout, so the test supplies the sizes and reports changes itself.
let contentHeight = 0;
let notifyResize: () => void = () => undefined;

beforeEach(() => {
  contentHeight = 0;
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(() => contentHeight);
  vi.stubGlobal(
    "ResizeObserver",
    class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () => {
          callback([], this);
        };
      }
      observe(): void {
        // Sizes come from the mocks above.
      }
      unobserve(): void {
        // See observe().
      }
      disconnect(): void {
        notifyResize = () => undefined;
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useScrollableFocus", () => {
  it("leaves a box that fits its content out of the tab order", () => {
    contentHeight = 80;
    render(<Box overflowY="auto" />);
    expect(screen.getByTestId("box")).not.toHaveAttribute("tabindex");
  });

  it("makes a box a tab stop once its content overflows, and stops when it fits again", () => {
    contentHeight = 80;
    render(<Box overflowY="auto" />);

    contentHeight = 400;
    act(() => {
      notifyResize();
    });
    expect(screen.getByTestId("box")).toHaveAttribute("tabindex", "0");

    contentHeight = 80;
    act(() => {
      notifyResize();
    });
    expect(screen.getByTestId("box")).not.toHaveAttribute("tabindex");
  });

  it("ignores overflow in a box that does not scroll", () => {
    contentHeight = 400;
    render(<Box overflowY="visible" />);
    expect(screen.getByTestId("box")).not.toHaveAttribute("tabindex");
  });
});
