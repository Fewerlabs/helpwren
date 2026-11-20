/*
 * The wren's route down the page, as plain geometry: no DOM, no GSAP, so it can be tested.
 */

export interface Stop {
  name: string;
  /** Where the feet touch, in document pixels. */
  x: number;
  y: number;
  /** The still wren's width here, in pixels. */
  size: number;
  /** A waypoint is flown through without landing. */
  land: boolean;
  /** How the wren stands here once landed. */
  pose: "perched" | "asleep";
  facing: "left" | "right";
  /** For a stop inside a pinned entry: the scroll position at which the wren must be there. */
  arriveAt?: number;
  /**
   * For a stop inside a pinned entry: where the pin starts and how long it lasts, in scroll
   * pixels, and the stop's page position before the pin moves it.
   */
  pin?: { top: number; range: number; baseY: number };
}

/** How far above the straight line between two stops the wren arcs, as a share of the distance. */
export const ARC_LIFT = 0.18;
/** The arc never rises more than this, in pixels, so on a long leg the wren stays on screen. */
export const MAX_LIFT = 48;
/** The share of each leg's scroll spent sitting at the stop before taking off. */
export const HOLD = 0.12;
/** In a pinned entry, the share of each step the wren sits on its branch before hopping. */
export const PIN_HOLD = 0.45;
/** Where on the screen a stop is when the wren arrives at it: 45% down. */
export const ARRIVE_AT = 0.45;

/** A point through which the route passes: every stop, with a lifted midpoint between each pair. */
export function routePoints(stops: readonly Stop[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  stops.forEach((stop, index) => {
    const previous = stops[index - 1];
    if (previous) {
      const distance = Math.hypot(stop.x - previous.x, stop.y - previous.y);
      points.push({
        x: (previous.x + stop.x) / 2,
        y: Math.min(previous.y, stop.y) - Math.min(MAX_LIFT, distance * ARC_LIFT * 0.5),
      });
    }
    points.push({ x: stop.x, y: stop.y });
  });
  return points;
}

/**
 * The route as cubic Bézier segments, one between each pair of points (Catmull-Rom turned into
 * Béziers), each written as its own path so its length can be measured.
 */
export function routeSegments(points: readonly { x: number; y: number }[]): string[] {
  const segments: string[] = [];
  const f = (n: number) => n.toFixed(1);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    segments.push(
      `M${f(p1.x)} ${f(p1.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`,
    );
  }
  return segments;
}

/** The whole route as one SVG path. */
export function smoothPath(points: readonly { x: number; y: number }[]): string {
  return routeSegments(points)
    .map((segment, index) => (index === 0 ? segment : segment.replace(/^M[^C]*/, "")))
    .join("");
}

/** The scroll position at which the wren reaches each stop: when the stop is 45% down the screen. */
export function arrivals(stops: readonly Stop[], viewport: number, maxScroll: number): number[] {
  let last = 0;
  return stops.map((stop, index) => {
    const natural = stop.y - viewport * ARRIVE_AT;
    const at = index === 0 ? 0 : Math.min(maxScroll, Math.max(0, stop.arriveAt ?? natural));
    // Never earlier than the stop before, so the wren does not fly backwards.
    last = Math.max(last, at);
    return last;
  });
}

export interface FlightState {
  /** Which leg: from stop `leg` to stop `leg + 1`. */
  leg: number;
  /** How far along that leg the wren has flown, 0 to 1, eased. 0 while it sits at the stop. */
  along: number;
}

/** How much of the leg's easing is a soft take-off and landing; the rest keeps pace with the scroll. */
const EASE_SHARE = 0.35;

/**
 * Eases a leg: a little slower off the branch and onto the next, but mostly in step with the
 * scroll, so the wren stays near the middle of the screen however long the leg.
 */
export function easeLeg(t: number): number {
  const smooth = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  return t * (1 - EASE_SHARE) + smooth * EASE_SHARE;
}

/**
 * Where the wren is for a scroll position. It sits at each stop for the first part of the leg
 * (`HOLD`, but not at a waypoint), then flies the rest.
 */
export function flightAt(
  scroll: number,
  stops: readonly Stop[],
  times: readonly number[],
): FlightState {
  const lastLeg = Math.max(0, stops.length - 2);
  for (let leg = 0; leg <= lastLeg; leg++) {
    const start = times[leg] ?? 0;
    const end = times[leg + 1] ?? start;
    if (scroll < end || leg === lastLeg) {
      if (end <= start) return { leg, along: scroll >= end ? 1 : 0 };
      // No hold at a waypoint, nor on leaving a pinned entry (it scrolls away). Between perches of
      // a pinned entry the wren sits longer: one hop per step of the scroll.
      const from = stops[leg];
      const to = stops[leg + 1];
      const leavingPin = from?.arriveAt !== undefined && to?.arriveAt === undefined;
      const inPin = from?.arriveAt !== undefined && to?.arriveAt !== undefined;
      const hold = from?.land === false || leavingPin ? 0 : inPin ? PIN_HOLD : HOLD;
      const t = (scroll - start) / (end - start);
      const flying = Math.min(1, Math.max(0, (t - hold) / (1 - hold)));
      return { leg, along: easeLeg(flying) };
    }
  }
  return { leg: 0, along: 0 };
}
