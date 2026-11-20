/*
 * The wren in flight, drawn frame by frame, in the logo's single line and weight: four view
 * angles (side, three-quarter front, front, three-quarter back), each with an eight-frame wing
 * beat, a glide and a landing flare, and a set of perched idles. Every frame is SVG markup for the
 * logo's 56 by 56 box (viewBox "9 8 56 56"), where the feet are at 51% across and 88% down, so a
 * page can swap frames without the bird moving. Drawn to be played at 12 frames a second, like
 * drawn animation. Facing right; mirror for left.
 *
 * The bodies are drawn as outlines: the side view is the logo's own line; the other views are a
 * round body and head drawn as one outline (their union), so they read as the same bird turned.
 */

export const wrenViews = ["side", "three-quarter-front", "front", "three-quarter-back"] as const;
export type WrenView = (typeof wrenViews)[number];

export const wrenIdles = [
  "perched",
  "look",
  "blink",
  "tilt",
  "hop-crouch",
  "hop-up",
  "preen",
  "asleep",
] as const;
export type WrenIdle = (typeof wrenIdles)[number];

/** Frames in one wing beat: up, three down, the bottom, three recovering. */
export const WREN_BEAT_FRAMES = 8;
/** Frames in the landing flare: wings forward high, then a little lower, alternately. */
export const WREN_FLARE_FRAMES = 2;
/** Drawn-animation timing: frames a second. */
export const WREN_FPS = 12;

type Point = readonly [number, number];

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = ([x, y]: Point) => `${f(x)} ${f(y)}`;
const path = (d: string, extra = "") => `<path d="${d}"${extra} />`;
const dot = ([x, y]: Point, r = 1.4) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="currentColor" stroke="none" />`;

/** The logo's body line, beak to the right. */
const SIDE_BODY =
  "M61.5 27.6 53.6 28.4C52 23 47.5 19.5 42 19.5 35.5 19.5 29 22.5 25 28.5 21.5 25 19 20 18 14.5L13.5 16.5C15 23 18.5 30 22 34.5 22 43.5 28.5 49.5 37.5 50 47 50.5 54.5 43 54.5 34 54.5 33 54.5 32.3 54.3 31.6Z";
const SIDE_BROW = "M42 24.4C45 22.8 48.3 23 50.8 24.6";
const SIDE_EYE: Point = [47.5, 28.2];
const FOLDED_WING = "M28 34.5C30.5 41 38 44 45 39.5";
const FEET_DOWN = "M35.5 50 35 57M41.5 49.5 42.5 57";
const FEET_TUCKED = "M34.5 50 31 54.5M40.5 49.8 38 55";
const FEET_FORWARD = "M36.5 50 40 56.5M42 49.5 47 55";

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** One closed outline around an ellipse (body) and a circle (head) that overlap. */
function union(body: Ellipse, head: Ellipse, samples = 72): string {
  const inside = (e: Ellipse, [x, y]: Point) =>
    ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1;
  const ring = (e: Ellipse): Point[] =>
    Array.from({ length: samples }, (_, i) => {
      const t = (i / samples) * Math.PI * 2;
      return [e.cx + e.rx * Math.cos(t), e.cy + e.ry * Math.sin(t)] as const;
    });
  // The part of each shape's edge that lies outside the other, in order round the ring.
  const outside = (points: Point[], other: Ellipse): Point[] => {
    const start = points.findIndex(
      (p, i) => inside(other, p) && !inside(other, points[(i + 1) % points.length] ?? p),
    );
    const ordered = [...points.slice(start + 1), ...points.slice(0, start + 1)];
    return ordered.filter((p) => !inside(other, p));
  };
  const bodyEdge = outside(ring(body), head);
  const headEdge = outside(ring(head), body);
  const all = [...bodyEdge, ...headEdge];
  // Join them so the outline runs body, then head, each starting where the other ended.
  const first = all[0];
  if (!first) return "";
  const nearestHead = headEdge.reduce(
    (best, p, i) => {
      const last = bodyEdge[bodyEdge.length - 1] ?? first;
      const d = Math.hypot(p[0] - last[0], p[1] - last[1]);
      return d < best.d ? { d, i } : best;
    },
    { d: Infinity, i: 0 },
  ).i;
  const headOrdered = [...headEdge.slice(nearestHead), ...headEdge.slice(0, nearestHead)];
  return `M${[...bodyEdge, ...headOrdered].map(pt).join("L")}Z`;
}

interface ViewShape {
  /** The body (and head, and beak) outline and details, without wings or feet. */
  body: string;
  /** Shoulders, near first; and how each wing's reach is scaled and mirrored on screen. */
  wings: readonly { shoulder: Point; scale: number; mirror: 1 | -1 }[];
  /** A point on the back the trailing edge of the wing runs back to, relative to the shoulder. */
  root: Point;
}

const views: Record<WrenView, ViewShape> = {
  side: {
    body: path(SIDE_BODY) + path(SIDE_BROW) + dot(SIDE_EYE, 1.3),
    wings: [{ shoulder: [39, 29.5], scale: 1, mirror: 1 }],
    root: [-9, 4],
  },
  "three-quarter-front": {
    body:
      path(union({ cx: 35, cy: 40, rx: 14, ry: 12.5 }, { cx: 45, cy: 27.5, rx: 8.5, ry: 8.5 })) +
      path("M52.6 26.4 57.2 28.6 52.6 30.4") +
      path("M45.5 22.6C47.5 21.4 49.8 21.6 51.3 22.9") +
      dot([48.4, 26.4], 1.3) +
      dot([42.6, 25.6], 0.9) +
      path("M25.5 32.6C22 28.2 19.8 23.6 19 18.6L22.8 17.2C23.6 22 25.6 26.2 28.8 29.8"),
    wings: [
      { shoulder: [41, 30], scale: 0.6, mirror: -1 },
      { shoulder: [31, 34], scale: 0.95, mirror: 1 },
    ],
    root: [-7, 5],
  },
  front: {
    body:
      path(union({ cx: 37, cy: 41.5, rx: 13, ry: 13 }, { cx: 37, cy: 26.5, rx: 8.4, ry: 8.4 })) +
      path("M35.4 28.8 37 32.6 38.6 28.8") +
      path("M31.6 22.6C32.8 21.6 34.4 21.6 35.4 22.6M38.6 22.6C39.6 21.6 41.2 21.6 42.4 22.6") +
      dot([33.8, 25.6], 1.25) +
      dot([40.2, 25.6], 1.25),
    wings: [
      { shoulder: [27, 36], scale: 1, mirror: 1 },
      { shoulder: [47, 36], scale: 1, mirror: -1 },
    ],
    root: [2, 9],
  },
  "three-quarter-back": {
    body:
      path(union({ cx: 36, cy: 39, rx: 14, ry: 12.5 }, { cx: 45.5, cy: 27.6, rx: 7.8, ry: 7.8 })) +
      path("M53 27.6 55.6 28.3") +
      path("M25.6 41C22 45 18.2 47.8 14.4 49L16.2 52.8C20.6 51.2 24.6 48.2 28.2 44"),
    wings: [
      { shoulder: [42, 31], scale: 0.75, mirror: -1 },
      { shoulder: [30, 33], scale: 1, mirror: 1 },
    ],
    root: [-6, 6],
  },
};

/** One wing: leading edge out to the wrist and the tip, trailing edge back with feather notches. */
function wing(
  shoulder: Point,
  root: Point,
  angle: number,
  lag: number,
  scale: number,
  mirror: 1 | -1,
): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Pointing back along the body at 0 degrees, up at 90, forward past 90.
  const dir = (deg: number): Point => [-Math.cos(rad(deg)) * mirror, -Math.sin(rad(deg))];
  const folded = Math.abs(lag) >= 40;
  const upper = 10 * scale;
  const hand = (folded ? 9 : 14) * scale;
  const [sx, sy] = shoulder;
  const [ux, uy] = dir(angle);
  const wrist: Point = [sx + ux * upper, sy + uy * upper];
  const [hx, hy] = dir(angle - lag);
  const tip: Point = [wrist[0] + hx * hand, wrist[1] + hy * hand];
  const back: Point = [sx + root[0] * mirror * scale, sy + root[1] * scale];
  // Perpendicular to a line, towards the wing's leading edge side (the side the wrist is on).
  const normal = (from: Point, to: Point, amount: number): Point => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    return [(-dy / length) * amount, (dx / length) * amount];
  };
  const side =
    Math.sign(
      (tip[0] - back[0]) * (wrist[1] - back[1]) - (tip[1] - back[1]) * (wrist[0] - back[0]),
    ) || 1;
  // The leading edge: one smooth curve through the wrist to a rounded tip, as the logo's lines
  // curve, never a corner.
  const bend = normal(shoulder, wrist, 1.8 * side * -1);
  const toTip = normal(wrist, tip, 1.4 * side * -1);
  const lead =
    `M${pt(shoulder)}` +
    `Q${pt([(shoulder[0] + wrist[0]) / 2 + bend[0], (shoulder[1] + wrist[1]) / 2 + bend[1]])} ${pt(wrist)}` +
    `Q${pt([(wrist[0] + tip[0]) / 2 + toTip[0], (wrist[1] + tip[1]) / 2 + toTip[1]])} ${pt(tip)}`;
  // The trailing edge runs back from the tip, a hand's breadth behind the arm, in soft scallops
  // for the flight feathers, then along the secondaries to the back. The wing is a broad paddle
  // in every frame, never a stick.
  const [nx, ny] = (() => {
    const dx = back[0] - shoulder[0];
    const dy = back[1] - shoulder[1];
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  })();
  const behindWrist: Point = [wrist[0] + nx * 9 * scale, wrist[1] + ny * 9 * scale];
  const scallop = (from: Point, to: Point) => {
    const out = normal(from, to, -1.4 * side);
    return `Q${pt([(from[0] + to[0]) / 2 + out[0], (from[1] + to[1]) / 2 + out[1]])} ${pt(to)}`;
  };
  const mid = (p: Point, q: Point, t: number): Point => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ];
  const f1 = mid(tip, behindWrist, 0.5);
  return path(`${lead}${scallop(tip, f1)}${scallop(f1, behindWrist)}${scallop(behindWrist, back)}`);
}

/** The beat: [shoulder angle, how far the hand trails the arm]. Up, down, bottom, recover. */
const BEAT: readonly (readonly [number, number])[] = [
  [80, -15],
  [55, 18],
  [22, 26],
  [-18, 20],
  [-45, 0],
  [-24, -42],
  [16, -50],
  [56, -30],
];
const GLIDE: readonly [number, number] = [10, 4];
const FLARE: readonly (readonly [number, number])[] = [
  [112, -8],
  [98, 6],
];

function wingsFor(view: WrenView, angle: number, lag: number): string {
  const shape = views[view];
  const drawn = shape.wings.map(({ shoulder, scale, mirror }) =>
    wing(shoulder, shape.root, angle, lag, scale, mirror),
  );
  // The body is filled with the paper, so whatever lies behind it is hidden, as on paper: at a
  // three-quarter angle the far wing goes behind the body and the near one in front. Side on and
  // face on, every wing is in front.
  const paper = shape.body.replace("<path ", `<path fill="${PAPER}" `);
  if (view === "three-quarter-front" || view === "three-quarter-back") {
    const [far, ...near] = drawn;
    return (far ?? "") + paper + near.join("");
  }
  return paper + drawn.join("");
}

/** The fill that hides what is behind the body: the page's paper, unless the page says other. */
const PAPER = "var(--hw-wren-paper, var(--card))";

const around = (deg: number, [x, y]: Point) => ` transform="rotate(${f(deg)} ${f(x)} ${f(y)})"`;
const FEET: Point = [37.6, 57.3];
const CENTRE: Point = [37, 38];

/** A frame of the wing beat, 0 to 7. A little bob: the body rises on the downstroke. */
function beatFrame(view: WrenView, index: number): string {
  const [angle, lag] = BEAT[index % WREN_BEAT_FRAMES] ?? [0, 0];
  const bob = [0, -0.4, -0.9, -1.2, -0.8, -0.2, 0.3, 0.2][index % WREN_BEAT_FRAMES] ?? 0;
  const feet = view === "front" ? "M34 54 32.6 56.6M40 54 41.4 56.6" : FEET_TUCKED;
  return `<g transform="translate(0 ${f(bob)})">${path(feet)}${wingsFor(view, angle, lag)}</g>`;
}

function glideFrame(view: WrenView): string {
  const [angle, lag] = GLIDE;
  const feet = view === "front" ? "M34 54 32.6 56.6M40 54 41.4 56.6" : FEET_TUCKED;
  return `${path(feet)}${wingsFor(view, angle, lag)}`;
}

/** The flare: nose up, tail down, wings forward, legs out; stretched a little, then squashed. */
function flareFrame(view: WrenView, index: number): string {
  const [angle, lag] = FLARE[index % WREN_FLARE_FRAMES] ?? [100, 0];
  if (view === "front") {
    const squash = index % 2 === 0 ? "scale(0.97 1.05)" : "scale(1.03 0.96)";
    return `<g transform="translate(37.6 57.3) ${squash} translate(-37.6 -57.3)">${path("M33.5 53 29.5 58M40.5 53 44.5 58")}${wingsFor("front", 70 + index * 8, 10)}</g>`;
  }
  const stretch = index % 2 === 0 ? "scale(0.97 1.04)" : "scale(1.02 0.97)";
  return `<g transform="translate(37.6 57.3) ${stretch} translate(-37.6 -57.3)"><g${around(-18, CENTRE)}>${wingsFor(view, angle, lag)}</g>${path(FEET_FORWARD)}</g>`;
}

/** The plug the wren carries to the socket in the install entry, its cable held in the beak. */
const CARRIED_PLUG =
  path("M58.4 29.4C61.6 33 61.6 36.6 59.2 40") +
  path("M56 40H62.4V45.2H56Z") +
  path("M57.8 45.2V47.6M60.6 45.2V47.6");

const LOOK_BODY = views["three-quarter-front"].body;
const LOOK_WING = "M26.5 37.5C29 43.6 35.6 46.6 42 43";

function idleFrame(idle: WrenIdle): string {
  switch (idle) {
    case "perched":
      return (
        path(SIDE_BODY) + path(SIDE_BROW) + path(FOLDED_WING) + path(FEET_DOWN) + dot(SIDE_EYE, 1.3)
      );
    case "look":
      return LOOK_BODY + path(LOOK_WING) + path(FEET_DOWN);
    case "blink":
      // The look, with both eyes shut: short strokes instead of dots.
      return (
        LOOK_BODY.replace(/<circle[^>]*\/>/g, "") +
        path("M47 26.6C47.8 27.4 49 27.4 49.8 26.6M41.8 25.9C42.3 26.3 43 26.3 43.4 25.9") +
        path(LOOK_WING) +
        path(FEET_DOWN)
      );
    case "tilt":
      return `<g${around(-9, FEET)}>${LOOK_BODY}${path(LOOK_WING)}</g>${path(FEET_DOWN)}`;
    case "hop-crouch":
      return `<g transform="translate(37.6 57.3) scale(1.07 0.9) translate(-37.6 -57.3)">${path(SIDE_BODY)}${path(SIDE_BROW)}${path(FOLDED_WING)}${dot(SIDE_EYE, 1.3)}${path("M35.5 50 34.5 56M41.5 49.5 43 56")}</g>`;
    case "hop-up":
      return `<g transform="translate(0 -5) translate(37.6 57.3) scale(0.95 1.06) translate(-37.6 -57.3)">${path(SIDE_BODY)}${path(SIDE_BROW)}${path(FOLDED_WING)}${dot(SIDE_EYE, 1.3)}${path(FEET_TUCKED)}</g>`;
    case "preen":
      // Head turned back into the wing: the three-quarter-back body, beak to the shoulder.
      return (
        views["three-quarter-back"].body +
        path("M43.5 31.5 38.6 35.4") +
        path("M28 35C30.5 41 37 44.4 43 41") +
        path(FEET_DOWN)
      );
    case "asleep":
      return (
        `<g transform="translate(37.6 57.3) scale(1.03 0.97) translate(-37.6 -57.3)">` +
        path(SIDE_BODY) +
        path(FOLDED_WING) +
        path("M45.6 28.6C46.6 29.6 48.4 29.6 49.4 28.6") +
        `</g>` +
        path(FEET_DOWN) +
        path("M54 14H58L54 18H58M59.5 9H62L59.5 11.5H62", ' stroke-width="1.1" opacity="0.6"')
      );
  }
}

export type WrenFrameKind =
  | { kind: "beat"; index: number; carrying?: boolean }
  | { kind: "glide" }
  | { kind: "flare"; index: number }
  | { kind: "idle"; idle: WrenIdle };

const cache = new Map<string, string>();

/**
 * The SVG markup (paths and circles, stroked with currentColor) of one frame, for a <g> or an
 * <svg viewBox="9 8 56 56">. Idles are drawn at their own angle and ignore `view`.
 */
export function wrenFrame(view: WrenView, frame: WrenFrameKind): string {
  const key = `${view}:${JSON.stringify(frame)}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const markup =
    frame.kind === "beat"
      ? beatFrame(view, frame.index) + (frame.carrying && view === "side" ? CARRIED_PLUG : "")
      : frame.kind === "glide"
        ? glideFrame(view)
        : frame.kind === "flare"
          ? flareFrame(view, frame.index)
          : idleFrame(frame.idle);
  cache.set(key, markup);
  return markup;
}
