"use client";

import { WrenBird, wrenPoses, type WrenPose } from "@helpwren/design-system";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { useChatOpens } from "@/components/live-widget";
import { gsap, MotionPathPlugin, ScrollTrigger, useGSAP } from "@/motion/kit";
import { afterScroll } from "@/motion/scroll-sync";
import { capable } from "@/scenes/scene-slot";

import { arrivals, flightAt, routePoints, routeSegments, smoothPath, type Stop } from "./route";
import { publishWrenFrame, wrenFrame } from "./state";

const Wren3D = lazy(() => import("./wren-3d").then((module) => ({ default: module.Wren3D })));

/** The wren never tilts further than this, so it never looks like it is falling. */
const MAX_TILT_DEG = 18;
/** Wingbeats: how long each wing position is held while climbing. */
const FLAP_MS = 110;
/** How long the flight takes to catch up with the scrollbar, in seconds. */
const SCRUB = 0.6;
/** The last share of a leg flown in the landing pose. */
const LANDING_SHARE = 0.12;
/** How long to wait after the last resize before measuring the route again. */
const RESIZE_DEBOUNCE_MS = 200;
/** The width of the logo's box, in its own units: the poses are drawn in it. */
const FOOT_X = 0.51;
const FOOT_Y = 0.88;
/** How high the wren hops between two branches of a pinned entry, in pixels. */
const HOP_HEIGHT = 36;

/** The share of a pinned entry's scroll the wren spends hopping; it sits on the top branch after. */
const PIN_SPAN = 0.8;
/** The wren is kept this far inside the screen's top and bottom edges, in pixels. */
const EDGE = { top: 90, bottom: 110, side: 48 } as const;

/**
 * Keeps a value inside a range with a soft edge: inside, unchanged; past the edge, it slows and
 * stops, so the wren is pulled along the edge rather than lost off screen, and never jumps.
 */
function softClamp(value: number, low: number, high: number, give = 60): number {
  if (value < low) return low - give * (1 - Math.exp((value - low) / give));
  if (value > high) return high + give * (1 - Math.exp((high - value) / give));
  return value;
}

/** The wren is never drawn smaller than this, in pixels, so it reads at a glance in flight. */
const MIN_SIZE = 72;

function measureStops(): Stop[] {
  const marks = document.querySelectorAll<HTMLElement>("[data-wren-perch], [data-wren-waypoint]");
  const stops: Stop[] = [];
  let size = 64;
  for (const mark of marks) {
    const box = mark.getBoundingClientRect();
    const still = mark.querySelector("[data-still-wren]")?.getBoundingClientRect();
    if (still && still.width > 0) size = still.width;
    let y = box.top + window.scrollY;
    let arriveAt: number | undefined;
    let pin: Stop["pin"];

    // In a pinned entry the content stays on screen while the page scrolls past it. Each perch
    // there is placed where it will be when the wren reaches it, spread through the pin.
    const pinned = mark.closest<HTMLElement>("[data-pin]");
    const inner = pinned?.querySelector(".pin-inner");
    const held = inner ? getComputedStyle(inner).position === "sticky" : false;
    if (pinned && held) {
      const top = pinned.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(0, pinned.offsetHeight - window.innerHeight);
      const stuck = Math.min(range, Math.max(0, window.scrollY - top));
      const siblings = [...pinned.querySelectorAll("[data-wren-perch]")];
      const share = siblings.length > 1 ? siblings.indexOf(mark) / (siblings.length - 1) : 0;
      pin = { top, range, baseY: y - stuck };
      // The top branch is where the wren leaves from, when the entry lets go: the route starts
      // there. Lower branches are only flown between while the entry is held.
      y = y - stuck + (share === 1 ? range : share * range * PIN_SPAN);
      arriveAt = top + share * range * PIN_SPAN;
    }

    stops.push({
      name: mark.dataset.wrenPerch ?? mark.dataset.wrenWaypoint ?? "",
      x: box.left + window.scrollX,
      y,
      size,
      land: mark.dataset.wrenPerch !== undefined,
      pose: mark.dataset.pose === "asleep" ? "asleep" : "perched",
      facing: mark.dataset.facing === "left" ? "left" : "right",
      ...(arriveAt === undefined ? {} : { arriveAt }),
      ...(pin === undefined ? {} : { pin }),
    });
  }
  return stops;
}

/**
 * The one flying wren: a fixed layer over the screen holding the pencil trail and the bird,
 * which follows the scroll from perch to perch. It never moves the page; the page moves it.
 */
export function WrenFlight() {
  const layer = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const bird = useRef<HTMLDivElement>(null);
  // The wren hops when the live chat opens.
  const opens = useChatOpens();
  const opensRef = useRef(opens);
  useEffect(() => {
    opensRef.current = opens;
  }, [opens]);
  // The 3D wren, on devices that can draw it; the SVG wren until it has drawn its first frame.
  // This component only ever renders in the browser, so the device can be asked at once.
  const [threeD] = useState(capable);
  const [drawn, setDrawn] = useState(false);

  useGSAP(() => {
    const root = document.documentElement;
    let tween: gsap.core.Tween | null = null;
    let timer = 0;
    // The layer is fixed to the screen; inside it, a page-sized sheet moves with the scroll so the
    // route can be drawn in page coordinates.
    const follow = () => {
      if (page.current)
        page.current.style.transform = `translate3d(0, ${String(-window.scrollY)}px, 0)`;
    };
    const stopFollowing = afterScroll(follow);
    const beat = () => {
      const wren = bird.current;
      if (wren?.dataset.flapping === undefined) return;
      wren.dataset.pose = Math.floor(performance.now() / FLAP_MS) % 2 ? "wings-up" : "wings-down";
    };
    gsap.ticker.add(beat);
    window.addEventListener("scroll", follow, { passive: true });

    const build = () => {
      tween?.kill();
      const stops = measureStops();
      const svgLayer = page.current;
      const path = trail.current;
      const wren = bird.current;
      if (stops.length < 2 || !svgLayer || !path || !wren) return;

      const height = document.documentElement.scrollHeight;
      svgLayer.style.height = `${String(height)}px`;
      const points = routePoints(stops);
      path.setAttribute("d", smoothPath(points));
      const total = path.getTotalLength();
      // The length along the route at each stop: stops are every other point.
      const measure = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const lengths = routeSegments(points).map((segment) => {
        measure.setAttribute("d", segment);
        return measure.getTotalLength();
      });
      const atStop = stops.map((_, index) =>
        lengths.slice(0, index * 2).reduce((sum, length) => sum + length, 0),
      );
      const maxScroll = height - window.innerHeight;
      const times = arrivals(stops, window.innerHeight, maxScroll);
      // MotionPathPlugin measures the route once; positions along it are then cheap to read.
      const raw = MotionPathPlugin.cacheRawPathMeasurements(
        MotionPathPlugin.stringToRawPath(smoothPath(points)),
      );
      let landedAt = "";

      const render = (scroll: number) => {
        const { leg, along } = flightAt(scroll, stops, times);
        const from = stops[leg];
        const to = stops[leg + 1] ?? from;
        if (!from || !to) return;
        const startLength = atStop[leg] ?? 0;
        const endLength = atStop[leg + 1] ?? startLength;
        // By arc length, already eased: continuous, so the wren never jumps.
        const length = startLength + (endLength - startLength) * along;
        const progress = total > 0 ? length / total : 0;
        const point = MotionPathPlugin.getPositionOnPath(raw, progress, true);
        const angle = "angle" in point && typeof point.angle === "number" ? point.angle : 0;
        const radians = (angle * Math.PI) / 180;
        const dx = Math.cos(radians);
        const dy = Math.sin(radians);
        const sitting = along <= 0 || along >= 1;
        const stop = along >= 1 ? to : from;

        // Inside a pinned entry the branches stay on screen while the page scrolls, so the wren
        // goes with them: placed by the entry, not by the route, and hopping between branches.
        let x = point.x;
        let y = point.y;
        let hopDx = dx;
        let hopDy = dy;
        const pinned = sitting ? stop.pin : from.pin && to.pin ? from.pin : undefined;
        if (pinned) {
          const stuck = Math.min(pinned.range, Math.max(0, window.scrollY - pinned.top));
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
            hopDx = to.x - from.x;
            hopDy =
              to.pin.baseY - from.pin.baseY - Math.cos(Math.PI * along) * HOP_HEIGHT * Math.PI;
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

        let pose: WrenPose;
        let direction: number;
        let tilt = 0;
        if (sitting) {
          pose = stop.land ? stop.pose : "gliding";
          direction = stop.facing === "left" ? -1 : 1;
        } else {
          direction = hopDx < 0 ? -1 : 1;
          tilt = gsap.utils.clamp(
            -MAX_TILT_DEG,
            MAX_TILT_DEG,
            (Math.atan2(hopDy, Math.abs(hopDx)) * 180) / Math.PI,
          );
          if (along > 1 - LANDING_SHARE && to.land) pose = "landing";
          else if (hopDy < 0) pose = "wings-up";
          else pose = "gliding";
        }
        // Never lost off screen: a long or sideways leg pulls the wren along the screen's edge.
        if (!sitting) {
          const top = window.scrollY + EDGE.top;
          const bottom = window.scrollY + window.innerHeight - EDGE.bottom;
          y = softClamp(y, top, bottom);
          x = softClamp(x, EDGE.side, window.innerWidth - EDGE.side);
        }
        const size = Math.max(MIN_SIZE, from.size + (to.size - from.size) * along);
        // At the birdhouse it hops in through the door, and comes out again for the next leg.
        wren.style.opacity = here === "home-range" ? "0" : "1";
        wren.dataset.pose = pose;
        // Climbing, the SVG wren keeps beating its wings on the ticker, even when the scroll stops.
        if (pose === "wings-up") wren.dataset.flapping = "";
        else delete wren.dataset.flapping;
        wren.style.width = `${String(size)}px`;
        wren.style.height = `${String(size)}px`;
        wren.style.transform = `translate(${String(x - size * FOOT_X)}px, ${String(y - size * FOOT_Y)}px) rotate(${String(direction * tilt)}deg) scaleX(${String(direction)})`;
        gsap.set(path, { drawSVG: `0 ${String(progress * 100)}%` });

        // Tell the 3D wren, when there is one, where it is and what it is doing.
        wrenFrame.x = x;
        wrenFrame.y = y;
        wrenFrame.size = size;
        wrenFrame.direction = direction < 0 ? -1 : 1;
        wrenFrame.here = here;
        wrenFrame.reacts = opensRef.current;
        wrenFrame.mode = sitting
          ? here === "home-range"
            ? "inside"
            : stop.land
              ? stop.pose === "asleep"
                ? "asleep"
                : "perched"
              : "gliding"
          : pose === "landing"
            ? "landing"
            : hopDy < 0
              ? "climbing"
              : "gliding";
        wrenFrame.ready = true;
        publishWrenFrame();
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
          scrollTrigger: { start: 0, end: maxScroll, scrub: SCRUB },
        },
      );
      // Start exactly where the page is, not catching up from the top.
      proxy.scroll = Math.min(maxScroll, window.scrollY);
      tween.scrollTrigger?.update();
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
    ScrollTrigger.addEventListener("refresh", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ScrollTrigger.removeEventListener("refresh", onResize);
      window.removeEventListener("scroll", follow);
      stopFollowing();
      gsap.ticker.remove(beat);
      window.clearTimeout(timer);
      tween?.kill();
      delete root.dataset.wren;
    };
  });

  return (
    <div
      ref={layer}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      <div ref={page} className="absolute inset-x-0 top-0 will-change-transform">
        <svg className="absolute inset-0 size-full overflow-visible" fill="none">
          <defs>
            {/* Pencil grain: the line wavers a little, as a soft lead does on paper. */}
            <filter id="wren-trail-grain" x="-5%" y="-1%" width="110%" height="102%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="1.6" />
            </filter>
          </defs>
          <path
            ref={trail}
            stroke="var(--pencil)"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray="0"
            opacity={0.7}
            filter="url(#wren-trail-grain)"
          />
        </svg>
        <div
          ref={bird}
          data-pose="perched"
          data-3d={drawn ? "" : undefined}
          className="wren-flyer absolute top-0 left-0 transition-opacity duration-500"
          style={{ transformOrigin: `${String(FOOT_X * 100)}% ${String(FOOT_Y * 100)}%` }}
        >
          {wrenPoses.map((pose) => (
            <WrenBird
              key={pose}
              pose={pose}
              react={pose === "perched" && opens > 0 ? opens : undefined}
              data-flyer-pose={pose}
              className="absolute inset-0"
            />
          ))}
        </div>
      </div>
      {threeD ? (
        <Suspense fallback={null}>
          <Wren3D
            onReady={() => {
              setDrawn(true);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
