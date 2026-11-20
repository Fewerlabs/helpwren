import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WrenFlyer } from "./wren-flyer";
import { WREN_BEAT_FRAMES, wrenFrame, wrenIdles, wrenViews } from "./wren-frames";

describe("the wren's drawn frames", () => {
  it.each(wrenViews)(
    "draws a distinct eight-frame beat, a glide and a flare at the %s angle",
    (view) => {
      const beat = Array.from({ length: WREN_BEAT_FRAMES }, (_, index) =>
        wrenFrame(view, { kind: "beat", index }),
      );
      expect(new Set(beat).size).toBe(WREN_BEAT_FRAMES);
      expect(wrenFrame(view, { kind: "glide" })).toContain("<path");
      expect(wrenFrame(view, { kind: "flare", index: 0 })).not.toBe(
        wrenFrame(view, { kind: "flare", index: 1 }),
      );
    },
  );

  it("draws every idle, and only ever ink in the text colour", () => {
    for (const idle of wrenIdles) {
      const markup = wrenFrame("side", { kind: "idle", idle });
      expect(markup).toContain("<path");
      expect(markup).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it("adds the plug only when carrying", () => {
    const plain = wrenFrame("side", { kind: "beat", index: 1 });
    const carrying = wrenFrame("side", { kind: "beat", index: 1, carrying: true });
    expect(carrying.length).toBeGreaterThan(plain.length);
  });

  it("renders a frame in the logo's box, decorative unless labelled, and mirrors on request", () => {
    const { container, rerender } = render(<WrenFlyer frame={{ kind: "glide" }} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "9 8 56 56");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    rerender(<WrenFlyer frame={{ kind: "glide" }} mirrored label="The wren" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", "The wren");
    expect(container.querySelector("svg")?.style.transform).toBe("scaleX(-1)");
  });
});
