import { describe, expect, it } from "vitest";

import {
  blockedFeet,
  clearLine,
  findWay,
  measureWay,
  pointOnWay,
  roundClear,
  type Box,
} from "./corridor";

const foot = { size: 76, footX: 0.51, footY: 0.88 };
const bounds: Box = { left: 40, right: 1240, top: 10, bottom: 4000 };
// A column of writing down the middle of the page, as on the journal's entries.
const column: Box = { left: 300, right: 900, top: 400, bottom: 1600 };
const blocked = [blockedFeet(column, foot)];

describe("the wren's way round the words", () => {
  it("grows a block of words by the wren's box and the clearance", () => {
    const grown = blockedFeet(column, foot, 0);
    expect(grown.left).toBeCloseTo(300 - 0.49 * 76);
    expect(grown.right).toBeCloseTo(900 + 0.51 * 76);
    expect(grown.top).toBeCloseTo(400 - 0.12 * 76);
    expect(grown.bottom).toBeCloseTo(1600 + 0.88 * 76);
  });

  it("goes round a column of writing instead of across it, and every point stays clear", () => {
    const a = { x: 600, y: 300 };
    const b = { x: 600, y: 1800 };
    expect(clearLine(a, b, blocked, bounds)).toBe(false);
    const way = roundClear(findWay(a, b, blocked, bounds), blocked);
    expect(way[0]).toEqual(a);
    expect(way[way.length - 1]).toEqual(b);
    for (const point of way.slice(1, -1)) {
      const box = blocked[0];
      if (!box) throw new Error("no box");
      const inside =
        point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
      expect(inside).toBe(false);
    }
  });

  it("flies straight when nothing is in the way", () => {
    const way = findWay({ x: 100, y: 100 }, { x: 150, y: 2000 }, blocked, bounds);
    expect(way).toHaveLength(2);
  });

  it("measures across the page at a discount, so the page keeps scrolling as the wren crosses", () => {
    const way = measureWay(
      [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 400, y: 100 },
      ],
      0.25,
    );
    expect(way.total).toBe(200);
    expect(pointOnWay(way, 0.5).point).toEqual({ x: 0, y: 100 });
    expect(pointOnWay(way, 1).heading.x).toBeGreaterThan(0.9);
  });
});
