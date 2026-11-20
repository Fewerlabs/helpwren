/*
 * The wren's way between two stops, kept off the words: plain geometry, no DOM, so it can be
 * tested. The page is laid on a coarse grid; every heading, paragraph and caption blocks the cells
 * the wren's box would touch; the shortest way through the free cells is found, pulled straight
 * where nothing is in the way, and rounded so it reads as a flight, not a set of corners.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Where the wren's box sits around its feet, as shares of its size (the logo's box). */
export interface Footprint {
  size: number;
  footX: number;
  footY: number;
}

/** Grid cell size, in pixels: fine enough for a page margin, coarse enough to be quick. */
export const CELL = 12;
/** Clear space kept between the wren's box and any words, in pixels. */
export const CLEARANCE = 6;

/** The feet positions at which the wren's box would touch the box, grown by the clearance. */
export function blockedFeet(box: Box, foot: Footprint, clearance = CLEARANCE): Box {
  return {
    left: box.left - (1 - foot.footX) * foot.size - clearance,
    right: box.right + foot.footX * foot.size + clearance,
    top: box.top - (1 - foot.footY) * foot.size - clearance,
    bottom: box.bottom + foot.footY * foot.size + clearance,
  };
}

function inside(point: Point, boxes: readonly Box[]): boolean {
  return boxes.some(
    (box) => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom,
  );
}

/** Whether the straight line between two feet positions stays clear of every blocked box. */
export function clearLine(a: Point, b: Point, blocked: readonly Box[], bounds: Box): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (p.x < bounds.left || p.x > bounds.right || inside(p, blocked)) return false;
  }
  return true;
}

/**
 * The shortest way from `a` to `b` through the free cells, as feet positions. The two ends are
 * always allowed (the perches are placed by hand, beside the words). Falls back to the straight
 * line when there is no way through, which the overlap check then reports.
 */
export function findWay(a: Point, b: Point, blocked: readonly Box[], bounds: Box): Point[] {
  // A band of the page a little taller than the leg: the way may dip above or below the stops.
  const top = Math.max(bounds.top, Math.min(a.y, b.y) - CELL * 24);
  const bottom = Math.min(bounds.bottom, Math.max(a.y, b.y) + CELL * 24);
  const cols = Math.max(1, Math.ceil((bounds.right - bounds.left) / CELL));
  const rows = Math.max(1, Math.ceil((bottom - top) / CELL));
  const centre = (col: number, row: number): Point => ({
    x: bounds.left + (col + 0.5) * CELL,
    y: top + (row + 0.5) * CELL,
  });
  const cellOf = (p: Point) => ({
    col: Math.min(cols - 1, Math.max(0, Math.floor((p.x - bounds.left) / CELL))),
    row: Math.min(rows - 1, Math.max(0, Math.floor((p.y - top) / CELL))),
  });
  // Only the boxes that reach into this stretch of the page.
  const near = blocked.filter((box) => box.bottom > top && box.top < bottom);
  // A cell is free when its centre is outside every blocked box.
  const free = new Uint8Array(cols * rows).fill(1);
  for (const box of near) {
    const c0 = Math.max(0, Math.ceil((box.left - bounds.left) / CELL - 0.5));
    const c1 = Math.min(cols - 1, Math.floor((box.right - bounds.left) / CELL - 0.5));
    const r0 = Math.max(0, Math.ceil((box.top - top) / CELL - 0.5));
    const r1 = Math.min(rows - 1, Math.floor((box.bottom - top) / CELL - 0.5));
    for (let row = r0; row <= r1; row++) free.fill(0, row * cols + c0, row * cols + c1 + 1);
  }
  const start = cellOf(a);
  const goal = cellOf(b);
  const startIndex = start.row * cols + start.col;
  const goalIndex = goal.row * cols + goal.col;
  free[startIndex] = 1;
  free[goalIndex] = 1;

  // A* with eight neighbours; a binary heap keeps it quick on a tall page.
  const cost = new Float64Array(cols * rows).fill(Infinity);
  const from = new Int32Array(cols * rows).fill(-1);
  const heap: [number, number][] = [];
  const push = (index: number, priority: number) => {
    heap.push([priority, index]);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const p = heap[parent];
      const c = heap[i];
      if (!p || !c || p[0] <= c[0]) break;
      heap[parent] = c;
      heap[i] = p;
      i = parent;
    }
  };
  const pop = (): number | undefined => {
    const first = heap[0];
    const last = heap.pop();
    if (!first || !last) return undefined;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        const hm = heap[m];
        const hl = heap[l];
        const hr = heap[r];
        if (hl && hm && hl[0] < hm[0]) m = l;
        const hm2 = heap[m];
        if (hr && hm2 && hr[0] < hm2[0]) m = r;
        if (m === i) break;
        const a1 = heap[i];
        const b1 = heap[m];
        if (!a1 || !b1) break;
        heap[i] = b1;
        heap[m] = a1;
        i = m;
      }
    }
    return first[1];
  };
  const guess = (index: number) =>
    Math.hypot((index % cols) - goal.col, Math.floor(index / cols) - goal.row);
  cost[startIndex] = 0;
  push(startIndex, guess(startIndex));
  const done = new Uint8Array(cols * rows);
  for (let current = pop(); current !== undefined; current = pop()) {
    if (current === goalIndex) break;
    if (done[current]) continue;
    done[current] = 1;
    const col = current % cols;
    const row = Math.floor(current / cols);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const c = col + dx;
        const r = row + dy;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const next = r * cols + c;
        if (!free[next]) continue;
        // No cutting a blocked corner diagonally.
        if (dx !== 0 && dy !== 0 && (!free[row * cols + c] || !free[r * cols + col])) continue;
        const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
        const total = (cost[current] ?? Infinity) + step;
        if (total < (cost[next] ?? Infinity)) {
          cost[next] = total;
          from[next] = current;
          push(next, total + guess(next));
        }
      }
  }
  if (from[goalIndex] === -1 && goalIndex !== startIndex) return [a, b];
  const cells: Point[] = [];
  for (let index = goalIndex; index !== -1; index = from[index] ?? -1) {
    cells.push(centre(index % cols, Math.floor(index / cols)));
    if (index === startIndex) break;
  }
  cells.reverse();
  cells[0] = a;
  cells[cells.length - 1] = b;
  return pullStraight(cells, near, bounds);
}

/** Drops every corner that a straight line can skip without touching the words. */
export function pullStraight(
  points: readonly Point[],
  blocked: readonly Box[],
  bounds: Box,
): Point[] {
  const first = points[0];
  if (!first) return [];
  const out: Point[] = [first];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = anchor + 1;
    for (let j = points.length - 1; j > anchor + 1; j--) {
      const p = points[anchor];
      const q = points[j];
      if (p && q && clearLine(p, q, blocked, bounds)) {
        next = j;
        break;
      }
    }
    const point = points[next];
    if (point) out.push(point);
    anchor = next;
  }
  return out;
}

/**
 * Rounds the corners (Chaikin's corner cutting), keeping the ends, then samples the curve evenly
 * so a position along it is a cheap lookup.
 */
export function roundWay(points: readonly Point[], passes = 3, spacing = 4): Point[] {
  let line = [...points];
  for (let pass = 0; pass < passes; pass++) {
    if (line.length < 3) break;
    const next: Point[] = [];
    const first = line[0];
    if (first) next.push(first);
    for (let i = 0; i < line.length - 1; i++) {
      const p = line[i];
      const q = line[i + 1];
      if (!p || !q) continue;
      next.push({ x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 });
      next.push({ x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 });
    }
    const last = line[line.length - 1];
    if (last) next.push(last);
    line = next;
  }
  const out: Point[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const p = line[i];
    const q = line[i + 1];
    if (!p || !q) continue;
    const steps = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / spacing));
    for (let s = 0; s < steps; s++)
      out.push({ x: p.x + ((q.x - p.x) * s) / steps, y: p.y + ((q.y - p.y) * s) / steps });
  }
  const last = line[line.length - 1];
  if (last) out.push(last);
  return out;
}

/** The roundest version of a way that still keeps clear of the words. */
export function roundClear(points: readonly Point[], blocked: readonly Box[]): Point[] {
  for (let passes = 3; passes > 0; passes--) {
    const round = roundWay(points, passes);
    if (round.every((p, i) => i === 0 || i === round.length - 1 || !inside(p, blocked)))
      return round;
  }
  return roundWay(points, 0);
}

/**
 * A way with a running measure at each point, for placing the wren by scroll. Down the page the
 * measure is the distance flown; across it, only `across` of it. So while the wren crosses a gap
 * the page goes on scrolling beneath it, and it never falls far behind the screen or races ahead.
 */
export interface Way {
  points: Point[];
  measure: number[];
  total: number;
}

export function measureWay(points: readonly Point[], across = 0.35): Way {
  const measure: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1];
    const q = points[i];
    const previous = measure[i - 1] ?? 0;
    measure.push(p && q ? previous + Math.abs(q.y - p.y) + across * Math.abs(q.x - p.x) : previous);
  }
  return { points: [...points], measure, total: measure[measure.length - 1] ?? 0 };
}

/** The point at a share (0 to 1) of a way's measure, and the direction of flight there. */
export function pointOnWay(way: Way, share: number): { point: Point; heading: Point } {
  const target = Math.min(1, Math.max(0, share)) * way.total;
  let low = 0;
  let high = way.measure.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if ((way.measure[mid] ?? 0) < target) low = mid;
    else high = mid;
  }
  const a = way.points[low] ?? { x: 0, y: 0 };
  const b = way.points[high] ?? a;
  const ma = way.measure[low] ?? 0;
  const mb = way.measure[high] ?? ma;
  const t = mb > ma ? (target - ma) / (mb - ma) : 0;
  // The heading over a short stretch either side, so it turns smoothly.
  const before = way.points[Math.max(0, low - 4)] ?? a;
  const after = way.points[Math.min(way.points.length - 1, high + 4)] ?? b;
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
    heading: { x: dx / length, y: dy / length },
  };
}

/**
 * The nearest share of the way, from `share`, whose point lies between `low` and `high` down the
 * page (the part of the page on screen). Moving along the way, rather than pushing the wren off
 * it, keeps it clear of the words: every point on the way is. Unchanged if none is.
 */
export function shareInBand(way: Way, share: number, low: number, high: number): number {
  const { point } = pointOnWay(way, share);
  if (point.y >= low && point.y <= high) return share;
  const target = Math.min(1, Math.max(0, share)) * way.total;
  let index = way.measure.findIndex((m) => m >= target);
  if (index < 0) index = way.points.length - 1;
  const step = point.y < low ? 1 : -1;
  for (let i = index; i >= 0 && i < way.points.length; i += step) {
    const y = way.points[i]?.y ?? 0;
    if (y >= low && y <= high) return way.total > 0 ? (way.measure[i] ?? 0) / way.total : share;
  }
  return share;
}
