import { describe, expect, it } from "vitest";

import {
  arrivals,
  flightAt,
  HOLD,
  routePoints,
  routeSegments,
  smoothPath,
  type Stop,
} from "./route";

const stop = (name: string, x: number, y: number, land = true): Stop => ({
  name,
  x,
  y,
  size: 60,
  land,
  pose: "perched",
  facing: "right",
});

const stops = [
  stop("a", 100, 100),
  stop("b", 600, 900),
  stop("c", 200, 1800, false),
  stop("d", 500, 2600),
];

describe("the wren's route", () => {
  it("passes through every stop, with a lifted point between each pair", () => {
    const points = routePoints(stops);
    expect(points).toHaveLength(stops.length * 2 - 1);
    expect(points[0]).toEqual({ x: 100, y: 100 });
    expect(points[2]).toEqual({ x: 600, y: 900 });
    // The midpoint arcs above the higher of the two stops.
    expect(points[1]?.y).toBeLessThan(100);
  });

  it("draws one segment between each pair of points and joins them into one path", () => {
    const points = routePoints(stops);
    const segments = routeSegments(points);
    expect(segments).toHaveLength(points.length - 1);
    const path = smoothPath(points);
    expect(path.startsWith("M100.0 100.0C")).toBe(true);
    expect(path.match(/C/g)).toHaveLength(segments.length);
    expect(path.endsWith("500.0 2600.0")).toBe(true);
  });

  it("arrives at each stop when it is 45% down the screen, never going back", () => {
    const times = arrivals(stops, 800, 2400);
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(900 - 360);
    expect(times[3]).toBe(2240);
    for (let i = 1; i < times.length; i++)
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1] ?? 0);
  });

  it("sits at a perch before taking off, but flies straight through a waypoint", () => {
    const times = arrivals(stops, 800, 2400);
    const legOne = (times[1] ?? 0) - (times[0] ?? 0);
    expect(flightAt(legOne * HOLD * 0.5, stops, times)).toEqual({ leg: 0, along: 0 });
    expect(flightAt(legOne * 0.99, stops, times).along).toBeGreaterThan(0.9);

    const start = times[2] ?? 0;
    const end = times[3] ?? 0;
    expect(flightAt(start + (end - start) * 0.1, stops, times).along).toBeGreaterThan(0);
  });

  it("stays at the last stop at the bottom of the page", () => {
    const times = arrivals(stops, 800, 2400);
    expect(flightAt(10_000, stops, times)).toEqual({ leg: 2, along: 1 });
  });
});
