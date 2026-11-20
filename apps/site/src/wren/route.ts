/*
 * When the wren is where on its way down the page, as plain arithmetic: no DOM, no GSAP, so it
 * can be tested.
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

/** The share of each leg's scroll spent sitting at the stop before taking off. */
export const HOLD = 0.32;
/** In a pinned entry, the share of each step the wren sits on its branch before hopping. */
export const PIN_HOLD = 0.45;
/** Where on the screen a stop is when the wren arrives at it: 45% down. */
export const ARRIVE_AT = 0.45;
/** The least scroll between two stops, as a share of the screen's height. */
export const MIN_LEG = 0.3;

/** The scroll position at which the wren reaches each stop: when the stop is 45% down the screen. */
export function arrivals(stops: readonly Stop[], viewport: number, maxScroll: number): number[] {
  let last = 0;
  return stops.map((stop, index) => {
    const natural = stop.y - viewport * ARRIVE_AT;
    const at = index === 0 ? 0 : Math.min(maxScroll, Math.max(0, stop.arriveAt ?? natural));
    // Never earlier than the stop before, and never less than a short stretch of scroll after
    // it, so a leg between two stops at the same height (through the anatomy gap) is flown, not
    // jumped.
    last = index === 0 ? at : Math.min(maxScroll, Math.max(last + viewport * MIN_LEG, at));
    return last;
  });
}

export interface FlightState {
  /** Which leg: from stop `leg` to stop `leg + 1`. */
  leg: number;
  /** How far along that leg the wren has flown, 0 to 1, eased. 0 while it sits at the stop. */
  along: number;
  /** How far through its wait at the stop the wren is, 0 to 1: 1 once it has taken off. */
  wait: number;
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
 * (`HOLD`, but not at a waypoint, and never more than `holdLimit` pixels of scroll, so it leaves
 * before its perch scrolls away), then flies the rest.
 */
export function flightAt(
  scroll: number,
  stops: readonly Stop[],
  times: readonly number[],
  holdLimit = Infinity,
): FlightState {
  const lastLeg = Math.max(0, stops.length - 2);
  for (let leg = 0; leg <= lastLeg; leg++) {
    const start = times[leg] ?? 0;
    const end = times[leg + 1] ?? start;
    if (scroll < end || leg === lastLeg) {
      if (end <= start) return { leg, along: scroll >= end ? 1 : 0, wait: 1 };
      // No hold at a waypoint, nor on leaving a pinned entry (it scrolls away). Between perches of
      // a pinned entry the wren sits longer: one hop per step of the scroll.
      const from = stops[leg];
      const to = stops[leg + 1];
      const leavingPin = from?.pin !== undefined && to?.pin === undefined;
      const inPin = from?.pin !== undefined && to?.pin !== undefined;
      // On the top branch it sits until the entry lets go, then flies on.
      const pinEnd = from?.pin ? from.pin.top + from.pin.range : start;
      const hold =
        from?.land === false
          ? 0
          : leavingPin
            ? Math.min(0.9, Math.max(0, (pinEnd - start) / (end - start)))
            : inPin
              ? PIN_HOLD
              : Math.min(HOLD, holdLimit / (end - start));
      const t = (scroll - start) / (end - start);
      const flying = Math.min(1, Math.max(0, (t - hold) / (1 - hold)));
      const wait = hold > 0 ? Math.min(1, Math.max(0, t / hold)) : 1;
      return { leg, along: easeLeg(flying), wait };
    }
  }
  return { leg: 0, along: 0, wait: 0 };
}
