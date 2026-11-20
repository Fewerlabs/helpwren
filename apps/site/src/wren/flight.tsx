"use client";

import {
  WREN_FPS,
  WrenFlyer,
  wrenFrame,
  type WrenFrameKind,
  type WrenIdle,
  type WrenView,
} from "@helpwren/design-system";
import { useEffect, useRef } from "react";

import { useChatOpens } from "@/components/live-widget";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/kit";
import { afterScroll } from "@/motion/scroll-sync";

import {
  blockedFeet,
  findWay,
  measureWay,
  pointOnWay,
  roundClear,
  shareInBand,
  type Box,
  type Point,
  type Way,
} from "./corridor";
import { arrivals, flightAt, type Stop } from "./route";

/** The wren's size in flight and on its perches, in pixels: on a desktop, and on smaller screens. */
export const WREN_SIZE = 88;
export const WREN_SIZE_SMALL = 64;
/** From this width the wren is drawn at its desktop size. */
const DESKTOP = 1024;
/** The wren's size for the screen it is on now. */
let wrenSize = WREN_SIZE;
/** Where the feet are in the logo's box, as shares of its width and height. */
const FOOT_X = 0.51;
const FOOT_Y = 0.88;
/** Clear space kept between the wren and any words; covers its box growing as it tilts. */
const CLEARANCE = 18;
/** How high the wren rises off its branch before it sets off, in pixels. */
const RISE = 54;
/** The wren never tilts further than this, so it banks, never tumbles. */
const MAX_TILT_DEG = 15;
/** How long the flight takes to catch up with the scrollbar, in seconds. */
const SCRUB = 0.6;
/** The last share of a leg flown in the landing flare. */
const FLARE_SHARE = 0.14;
/** The first share of a leg spent springing off the branch. */
const TAKE_OFF_SHARE = 0.06;
/** The last share of the wait at a perch spent crouching, about to go. */
const CROUCH_SHARE = 0.15;
/** How long to wait after the last resize before measuring the route again. */
const RESIZE_DEBOUNCE_MS = 200;
/** How high the wren hops between two branches of a pinned entry, in pixels. */
const HOP_HEIGHT = 36;
/** The share of a pinned entry's scroll the wren spends hopping; it sits on the top branch after. */
const PIN_SPAN = 0.8;
/** The wren leaves a perch before the perch has scrolled higher than this share of the screen. */
const LEAVE_BY = 0.32;
/** The wren is kept this far inside the screen's edges, in pixels, as a last resort. */
const EDGE = { top: 8, bottom: 8 } as const;
/**
 * How much of a sideways stretch counts against the scroll: crossing a gap takes a little scroll,
 * so the wren darts across while the page barely moves, and stays near the middle of the screen.
 */
const ACROSS = 0.2;
/** The words the wren must never cross: headings, paragraphs, captions, list items, code. */
export const TEXT_SELECTOR = "h1, h2, h3, h4, h5, h6, p, figcaption, li, blockquote, pre, dt, dd";

const FRAME_MS = 1000 / WREN_FPS;
/** The soft edge of the last-resort clamp, in pixels; the clamp never lets the box past it. */
const GIVE = 30;

/**
 * Keeps a value inside a range with a soft edge: inside, unchanged; past the edge, it slows and
 * stops, so the wren is pulled along the edge rather than lost off screen, and never jumps.
 */
function softClamp(value: number, low: number, high: number, give = 40): number {
  if (value < low) return low - give * (1 - Math.exp((value - low) / give));
  if (value > high) return high + give * (1 - Math.exp((high - value) / give));
  return value;
}

/** How far a pinned entry has been carried down the page at this scroll, in pixels. */
function stuckFor(pin: { top: number; range: number }, scroll: number): number {
  return Math.min(pin.range, Math.max(0, scroll - pin.top));
}

/** How the pinned entry holding an element moves it: its pin, if it is held right now. */
function pinOf(element: Element): { top: number; range: number } | undefined {
  const pinned = element.closest<HTMLElement>("[data-pin]");
  const inner = pinned?.querySelector(".pin-inner");
  if (!pinned || !inner || getComputedStyle(inner).position !== "sticky") return undefined;
  return {
    top: pinned.getBoundingClientRect().top + window.scrollY,
    range: Math.max(0, pinned.offsetHeight - window.innerHeight),
  };
}

function measureStops(): Stop[] {
  const marks = document.querySelectorAll<HTMLElement>("[data-wren-perch], [data-wren-waypoint]");
  const stops: Stop[] = [];
  for (const mark of marks) {
    const box = mark.getBoundingClientRect();
    let y = box.top + window.scrollY;
    let arriveAt: number | undefined;
    let pin: Stop["pin"];

    // In a pinned entry the content stays on screen while the page scrolls past it. Each perch
    // there is placed where it will be when the wren reaches it, spread through the pin.
    const held = pinOf(mark);
    // Not pinned (a narrower screen): one perch per entry, its first, so the wren does not climb
    // back up the page while the reader scrolls down.
    const group = mark.closest("[data-pin]");
    if (group && !held && group.querySelector("[data-wren-perch]") !== mark) continue;
    const pinned = mark.closest("[data-pin]");
    if (held && pinned) {
      const stuck = stuckFor(held, window.scrollY);
      const siblings = [...pinned.querySelectorAll("[data-wren-perch]")];
      const share = siblings.length > 1 ? siblings.indexOf(mark) / (siblings.length - 1) : 0;
      pin = { top: held.top, range: held.range, baseY: y - stuck };
      // The top branch is where the wren leaves from, when the entry lets go: the route starts
      // there. Lower branches are only flown between while the entry is held.
      y = y - stuck + (share === 1 ? held.range : share * held.range * PIN_SPAN);
      arriveAt = held.top + share * held.range * PIN_SPAN;
    }

    stops.push({
      name: mark.dataset.wrenPerch ?? mark.dataset.wrenWaypoint ?? "",
      x: box.left + window.scrollX,
      y,
      size: wrenSize,
      land: mark.dataset.wrenPerch !== undefined,
      pose: mark.dataset.pose === "asleep" ? "asleep" : "perched",
      facing: mark.dataset.facing === "left" ? "left" : "right",
      ...(arriveAt === undefined ? {} : { arriveAt }),
      ...(pin === undefined ? {} : { pin }),
    });
  }
  return stops;
}

/** Every block of words on the page, in page pixels, with the pin that carries it, if any. */
function measureWords(): { box: Box; pin?: { top: number; range: number } }[] {
  const all = [...document.querySelectorAll<HTMLElement>(TEXT_SELECTOR)];
  const words: { box: Box; pin?: { top: number; range: number } }[] = [];
  for (const element of all) {
    if (element.closest("[data-wren-layer]")) continue;
    // A list item holding paragraphs or headings is measured by those, not as one block.
    if (element.querySelector(TEXT_SELECTOR)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const pin = pinOf(element);
    const stuck = pin ? stuckFor(pin, window.scrollY) : 0;
    words.push({
      box: {
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        top: rect.top + window.scrollY - stuck,
        bottom: rect.bottom + window.scrollY - stuck,
      },
      ...(pin ? { pin } : {}),
    });
  }
  return words;
}

/** What the wren is doing, set by the scroll; the frames follow it on their own clock. */
interface Doing {
  mode: "air" | "perched" | "asleep" | "inside";
  heading: Point;
  /** Down the screen, in pixels per frame: a dive shows the wren's face. */
  dropping: number;
  carrying: boolean;
  flare: -1 | 0 | 1;
  takeOff: boolean;
  crouch: boolean;
  facing: 1 | -1;
}

const IDLE_WEIGHTS: [WrenIdle | "hop" | "double-blink", number][] = [
  ["blink", 30],
  ["double-blink", 8],
  ["look", 20],
  ["tilt", 18],
  ["preen", 12],
  ["hop", 12],
];

function pickIdle(): WrenIdle | "hop" | "double-blink" {
  const total = IDLE_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [idle, weight] of IDLE_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return idle;
  }
  return "blink";
}

/**
 * The one flying wren: a fixed layer over the screen holding the bird, which follows the scroll
 * from perch to perch through the margins and gaps, never over the words. It is drawn frame by
 * frame, like hand-drawn animation, from the design system's frames. It never moves the page;
 * the page moves it.
 */
export function WrenFlight() {
  const page = useRef<HTMLDivElement>(null);
  const bird = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  // The wren hops when the live chat opens.
  const opens = useChatOpens();
  const hopRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (opens > 0) hopRef.current?.();
  }, [opens]);

  useGSAP(() => {
    const root = document.documentElement;
    let tween: gsap.core.Tween | null = null;
    let timer = 0;
    const doing: Doing = {
      mode: "perched",
      heading: { x: 1, y: 0 },
      dropping: 0,
      carrying: false,
      flare: -1,
      takeOff: false,
      crouch: false,
      facing: 1,
    };

    // The layer is fixed to the screen; inside it, a page-sized sheet moves with the scroll so
    // the wren can be placed in page coordinates.
    const follow = () => {
      if (page.current)
        page.current.style.transform = `translate3d(0, ${String(-window.scrollY)}px, 0)`;
    };
    const stopFollowing = afterScroll(follow);
    window.addEventListener("scroll", follow, { passive: true });

    // ---- The frames: their own clock, twelve a second, whatever the scroll is doing. ----
    const svg = () => bird.current?.querySelector("svg");
    let shown = "";
    let view: WrenView = "side";
    let mirrored = false;
    let beat = 0;
    let glide = 0;
    let beatsSinceGlide = 0;
    let wasAir = false;
    let idle: { frame: WrenIdle; until: number } | null = null;
    let queue: { frame: WrenIdle; ms: number; lift?: boolean }[] = [];
    let nextIdle = performance.now() + 1800;
    let last = performance.now();
    let carry = 0;

    const show = (nextView: WrenView, frame: WrenFrameKind, mirror: boolean) => {
      const key = `${nextView}:${JSON.stringify(frame)}:${String(mirror)}`;
      const element = svg();
      if (!element || key === shown) return;
      shown = key;
      element.innerHTML = wrenFrame(nextView, frame);
      element.style.transform = mirror ? "scaleX(-1)" : "";
    };

    const squash = (x: number, y: number, duration = 0.5) => {
      if (!body.current) return;
      gsap.fromTo(
        body.current,
        { scaleX: x, scaleY: y },
        { scaleX: 1, scaleY: 1, duration, ease: "elastic.out(1, 0.45)", overwrite: "auto" },
      );
    };

    const hop = () => {
      if (doing.mode !== "perched" || !body.current) return;
      queue = [
        { frame: "hop-crouch", ms: 140 },
        { frame: "hop-up", ms: 240, lift: true },
        { frame: "perched", ms: 10 },
      ];
      idle = null;
    };
    hopRef.current = hop;

    const desiredView = (): WrenView => {
      if (doing.carrying) return "side";
      const { x, y } = doing.heading;
      const angle = (Math.atan2(y, Math.abs(x) + 0.2) * 180) / Math.PI;
      if (angle > 76 && doing.dropping > 1.2) return "front";
      if (angle > 52) return "three-quarter-front";
      if (angle < -52) return "three-quarter-back";
      return "side";
    };

    const tick = () => {
      const now = performance.now();
      carry += now - last;
      last = now;
      if (carry < FRAME_MS) return;
      carry %= FRAME_MS;
      const element = bird.current;
      if (!element) return;
      element.style.opacity = doing.mode === "inside" ? "0" : "1";

      if (doing.mode === "air") {
        idle = null;
        queue = [];
        if (!wasAir) {
          beat = 0;
          wasAir = true;
        }
        // The view and the facing change only between wingbeats, never in the middle of one.
        const facingLeft = doing.facing < 0;
        if (beat === 0 && glide === 0) {
          const wanted = desiredView();
          // Turning round passes through three-quarter front for a beat.
          if (facingLeft !== mirrored && view === "side") view = "three-quarter-front";
          else view = wanted;
          mirrored = facingLeft;
        }
        if (doing.takeOff) {
          show("side", { kind: "idle", idle: "hop-up" }, mirrored);
          return;
        }
        if (doing.flare >= 0) {
          show(view, { kind: "flare", index: doing.flare }, mirrored);
          return;
        }
        // Small birds flap in bursts: going down, two beats then a short glide; level or up, flap.
        // A glide at the top of each arc: level or just past level, after a burst of beats.
        const level = doing.heading.y > -0.2 && doing.heading.y < 0.45 && !doing.carrying;
        if (glide > 0) {
          glide -= 1;
          show(view, { kind: "glide" }, mirrored);
          return;
        }
        show(view, { kind: "beat", index: beat, carrying: doing.carrying }, mirrored);
        beat = (beat + 1) % 8;
        if (beat === 0) {
          beatsSinceGlide += 1;
          if (level && beatsSinceGlide >= 2) {
            glide = 5 + Math.round(Math.random() * 3);
            beatsSinceGlide = 0;
          }
        }
        return;
      }

      // Landed: a squash as the feet take the weight, then a small springy settle.
      if (wasAir) {
        wasAir = false;
        glide = 0;
        squash(1.14, 0.84, 0.6);
        nextIdle = now + 900 + Math.random() * 1400;
      }
      mirrored = doing.facing < 0;
      view = "side";
      if (doing.mode === "asleep") {
        show("side", { kind: "idle", idle: "asleep" }, mirrored);
        return;
      }
      if (doing.crouch) {
        show("side", { kind: "idle", idle: "hop-crouch" }, mirrored);
        return;
      }
      // Idles, at uneven intervals, so it looks alive rather than on a loop.
      if (!idle && queue.length === 0 && now >= nextIdle) {
        const choice = pickIdle();
        if (choice === "hop") hop();
        else if (choice === "double-blink")
          queue = [
            { frame: "blink", ms: 110 },
            { frame: "perched", ms: 140 },
            { frame: "blink", ms: 110 },
          ];
        else
          queue = [
            {
              frame: choice,
              ms:
                choice === "blink"
                  ? 120
                  : choice === "look"
                    ? 1100 + Math.random() * 900
                    : 700 + Math.random() * 600,
            },
          ];
        nextIdle = now + 1500 + Math.random() * 3600;
      }
      if (!idle || now >= idle.until) {
        const next = queue.shift();
        if (next) {
          idle = { frame: next.frame, until: now + next.ms };
          if (next.frame === "hop-crouch") squash(1.08, 0.9, 0.25);
          if (next.lift && body.current)
            gsap.fromTo(
              body.current,
              { y: 0, scaleX: 0.94, scaleY: 1.08 },
              {
                keyframes: [
                  { y: -12, duration: 0.12, ease: "power2.out" },
                  { y: 0, duration: 0.12, ease: "power2.in" },
                ],
                onComplete: () => {
                  squash(1.1, 0.88, 0.45);
                },
              },
            );
        } else idle = null;
      }
      show("side", { kind: "idle", idle: idle?.frame ?? "perched" }, mirrored);
    };
    gsap.ticker.add(tick);

    // ---- The route: rebuilt whenever the page is measured again. ----
    const build = () => {
      tween?.kill();
      wrenSize = window.innerWidth >= DESKTOP ? WREN_SIZE : WREN_SIZE_SMALL;
      const stops = measureStops();
      const sheet = page.current;
      const wren = bird.current;
      if (stops.length < 2 || !sheet || !wren) return;

      const height = document.documentElement.scrollHeight;
      sheet.style.height = `${String(height)}px`;
      const width = document.documentElement.clientWidth;
      const WREN = wrenSize;
      wren.style.width = `${String(WREN)}px`;
      wren.style.height = `${String(WREN)}px`;
      const foot = { size: WREN, footX: FOOT_X, footY: FOOT_Y };
      const words = measureWords();
      const bounds: Box = {
        // Room at the screen's sides for the box as it tilts, which makes it wider.
        left: FOOT_X * WREN + 10,
        right: width - (1 - FOOT_X) * WREN - 10,
        top: (1 - FOOT_Y) * WREN + 4,
        bottom: height,
      };
      // One way per leg, round the words. Words in a pinned entry are where they will be while
      // the wren flies that leg: before the pin for the leg in, after it for the leg out.
      const ways: Way[] = stops.slice(1).map((to, index) => {
        const from = stops[index] ?? to;
        const shift = from.pin && !to.pin ? from.pin.range : 0;
        const blocked = words.map(({ box, pin }) =>
          blockedFeet(
            pin ? { ...box, top: box.top + shift, bottom: box.bottom + shift } : box,
            foot,
            CLEARANCE,
          ),
        );
        if (from.pin && to.pin) return measureWay([from, to]);
        // Up off the branch first, when there is room above it, then on its way.
        const rise = { x: from.x, y: from.y - RISE };
        const clear = (point: Point) =>
          !blocked.some(
            (box) =>
              point.x > box.left &&
              point.x < box.right &&
              point.y > box.top &&
              point.y < box.bottom,
          );
        const corners =
          from.land && clear(rise)
            ? [from, ...findWay(rise, to, blocked, bounds)]
            : findWay(from, to, blocked, bounds);
        return measureWay(roundClear(corners, blocked), ACROSS);
      });
      const maxScroll = height - window.innerHeight;
      const times = arrivals(stops, window.innerHeight, maxScroll);
      const holdLimit = window.innerHeight * (0.45 - LEAVE_BY);
      // The sticky header covers the top of the screen; the wren keeps below it.
      const headerHeight =
        document.querySelector("[data-site-header]")?.getBoundingClientRect().height ?? 0;
      let landedAt = "";
      let lastScroll = window.scrollY;
      let lastScreenY = 0;

      const render = (scroll: number) => {
        const { leg, along, wait } = flightAt(scroll, stops, times, holdLimit);
        const from = stops[leg];
        const to = stops[leg + 1] ?? from;
        const way = ways[leg];
        if (!from || !to || !way) return;
        const sitting = along <= 0 || along >= 1;
        const stop = along >= 1 ? to : from;
        // Kept on screen, below the header, by moving along the way, never off it.
        const band = {
          low: window.scrollY + headerHeight + EDGE.top + FOOT_Y * WREN,
          high: window.scrollY + window.innerHeight - EDGE.bottom - (1 - FOOT_Y) * WREN,
        };
        const placed =
          sitting || (from.pin && to.pin) ? along : shareInBand(way, along, band.low, band.high);
        const { point, heading } = pointOnWay(way, placed);

        // Inside a pinned entry the branches stay on screen while the page scrolls, so the wren
        // goes with them: placed by the entry, not by the route, and hopping between branches.
        let { x, y } = point;
        let dirX = heading.x;
        let dirY = heading.y;
        const pinned = sitting ? stop.pin : from.pin && to.pin ? from.pin : undefined;
        if (pinned) {
          const stuck = stuckFor(pinned, window.scrollY);
          if (sitting && stop.pin) {
            x = stop.x;
            y = stop.pin.baseY + stuck;
          } else if (from.pin && to.pin) {
            x = from.x + (to.x - from.x) * along;
            y =
              from.pin.baseY +
              (to.pin.baseY - from.pin.baseY) * along -
              Math.sin(Math.PI * along) * HOP_HEIGHT +
              stuck;
            dirX = to.x - from.x;
            dirY = -Math.cos(Math.PI * along);
          }
        }

        // Tell the entry the wren has landed in it, so it can do its small thing.
        const here = sitting && stop.land ? stop.name : "";
        if (here !== landedAt) {
          if (landedAt)
            document
              .querySelector(`[data-wren-perch="${landedAt}"]`)
              ?.closest("[data-entry], footer")
              ?.removeAttribute("data-wren-here");
          if (here) {
            const entry = document
              .querySelector(`[data-wren-perch="${here}"]`)
              ?.closest("[data-entry], footer");
            entry?.setAttribute("data-wren-here", here);
            // Stays once set: what the wren started there (the snippet typing) is not undone.
            entry?.setAttribute("data-wren-visited", "");
          }
          landedAt = here;
        }

        // Flying back up the page when the reader scrolls back: it turns round.
        const travel = scroll < lastScroll ? -1 : 1;
        lastScroll = scroll;
        let tilt = 0;
        if (sitting) {
          doing.mode =
            here === "home-range"
              ? "inside"
              : stop.land
                ? stop.pose === "asleep"
                  ? "asleep"
                  : "perched"
                : "air";
          doing.facing = stop.facing === "left" ? -1 : 1;
          doing.crouch = stop.land && along <= 0 && wait > 1 - CROUCH_SHARE && travel > 0;
          doing.flare = -1;
          doing.takeOff = false;
        } else {
          const hx = dirX * travel;
          const hy = dirY * travel;
          const length = Math.hypot(hx, hy) || 1;
          doing.mode = "air";
          doing.heading = { x: hx / length, y: hy / length };
          if (Math.abs(doing.heading.x) > 0.15) doing.facing = doing.heading.x < 0 ? -1 : 1;
          doing.carrying = to.name === "nest" && travel > 0;
          const landing =
            travel > 0 ? to.land && along > 1 - FLARE_SHARE : from.land && along < FLARE_SHARE;
          const edge = travel > 0 ? 1 - along : along;
          doing.flare = landing ? (edge < FLARE_SHARE / 2 ? 1 : 0) : -1;
          doing.takeOff =
            travel > 0
              ? from.land && along < TAKE_OFF_SHARE
              : to.land && along > 1 - TAKE_OFF_SHARE;
          doing.crouch = false;
          // Banking: nose down going down, up going up, never past the limit. Side on, by the
          // slope; face on, a lean into the turn.
          tilt =
            Math.abs(doing.heading.x) > 0.5
              ? (Math.atan2(doing.heading.y, Math.abs(doing.heading.x)) * 180) / Math.PI
              : doing.heading.x * MAX_TILT_DEG;
          tilt = gsap.utils.clamp(-MAX_TILT_DEG, MAX_TILT_DEG, tilt);
          // A last resort on screen: the way is planned to stay in view, this only catches a
          // leg squeezed by a very short screen.
          const size = WREN;
          y = softClamp(
            y,
            window.scrollY + headerHeight + EDGE.top + FOOT_Y * size + GIVE,
            window.scrollY + window.innerHeight - EDGE.bottom - (1 - FOOT_Y) * size - GIVE,
            GIVE,
          );
        }
        const screenY = y - window.scrollY;
        doing.dropping = doing.dropping * 0.7 + (screenY - lastScreenY) * 0.3;
        lastScreenY = screenY;

        const size = WREN;
        const direction = doing.facing;
        const lean = Math.abs(doing.heading.x) > 0.5 ? direction * tilt : tilt;
        wren.dataset.mode = doing.mode;
        wren.style.width = `${String(size)}px`;
        wren.style.height = `${String(size)}px`;
        wren.style.transform = `translate(${String(x - size * FOOT_X)}px, ${String(y - size * FOOT_Y)}px) rotate(${String(lean)}deg)`;
      };

      // The tween runs from the top of the page to the bottom, whatever the scroll is when the
      // route is built (after a reload part way down, or a resize), so the wren is always where
      // the scroll says.
      const proxy = { scroll: 0 };
      tween = gsap.fromTo(
        proxy,
        { scroll: 0 },
        {
          scroll: maxScroll,
          ease: "none",
          immediateRender: true,
          onUpdate: () => {
            render(proxy.scroll);
          },
          // The overlap check (scripts/overlap-check.mjs) sets data-wren-check to read each
          // scroll position without waiting for the catch-up.
          scrollTrigger: {
            start: 0,
            end: maxScroll,
            scrub: root.dataset.wrenCheck === undefined ? SCRUB : true,
          },
        },
      );
      // Start exactly where the page is, not catching up from the top.
      proxy.scroll = Math.min(maxScroll, window.scrollY);
      tween.scrollTrigger?.update();
      lastScroll = proxy.scroll;
      render(proxy.scroll);
    };

    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, RESIZE_DEBOUNCE_MS);
    };

    root.dataset.wren = "flying";
    // Pinned entries grow once the wren flies; every trigger measures again before the route.
    ScrollTrigger.refresh();
    build();
    follow();
    void document.fonts.ready.then(build);
    window.addEventListener("resize", onResize);
    // Anything that changes the page's height (a component loading in, an image) moves the words
    // and the perches: measure the route again.
    let pageHeight = document.documentElement.scrollHeight;
    const growth = new ResizeObserver(() => {
      const next = document.documentElement.scrollHeight;
      if (Math.abs(next - pageHeight) < 2) return;
      pageHeight = next;
      onResize();
    });
    const main = document.querySelector("main");
    if (main) growth.observe(main);
    ScrollTrigger.addEventListener("refresh", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      growth.disconnect();
      ScrollTrigger.removeEventListener("refresh", onResize);
      window.removeEventListener("scroll", follow);
      stopFollowing();
      gsap.ticker.remove(tick);
      window.clearTimeout(timer);
      tween?.kill();
      hopRef.current = null;
      delete root.dataset.wren;
    };
  });

  return (
    <div
      aria-hidden="true"
      data-wren-layer
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      <div ref={page} className="absolute inset-x-0 top-0 will-change-transform">
        <div
          ref={bird}
          data-wren-flyer
          className="wren-flyer absolute top-0 left-0"
          style={{
            width: WREN_SIZE,
            height: WREN_SIZE,
            transformOrigin: `${String(FOOT_X * 100)}% ${String(FOOT_Y * 100)}%`,
          }}
        >
          <div
            ref={body}
            className="size-full"
            style={{ transformOrigin: `${String(FOOT_X * 100)}% ${String(FOOT_Y * 100)}%` }}
          >
            <WrenFlyer frame={{ kind: "idle", idle: "perched" }} className="size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
