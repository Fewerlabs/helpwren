import { describe, expect, it } from "vitest";

import { nextIndex } from "./navigation";

// 10 tiles, 4 to a row: two full rows and a last row of two.
const move = (key: string, index: number) => nextIndex(key, index, 10, 4, 2);

describe("nextIndex", () => {
  it("moves along a row and stops at the ends", () => {
    expect(move("ArrowRight", 0)).toBe(1);
    expect(move("ArrowRight", 9)).toBe(9);
    expect(move("ArrowLeft", 4)).toBe(3);
    expect(move("ArrowLeft", 0)).toBe(0);
  });

  it("moves between rows, onto the nearest tile of a shorter last row", () => {
    expect(move("ArrowDown", 1)).toBe(5);
    expect(move("ArrowDown", 7)).toBe(9);
    expect(move("ArrowDown", 9)).toBe(9);
    expect(move("ArrowUp", 5)).toBe(1);
  });

  it("leaves the grid going up from the first row", () => {
    expect(move("ArrowUp", 2)).toBeNull();
  });

  it("jumps to the ends and by pages", () => {
    expect(move("Home", 6)).toBe(0);
    expect(move("End", 1)).toBe(9);
    expect(move("PageDown", 1)).toBe(9);
    expect(move("PageUp", 9)).toBe(1);
  });

  it("ignores other keys", () => {
    expect(move("a", 3)).toBeNull();
  });
});
