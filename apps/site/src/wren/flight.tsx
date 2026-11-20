"use client";

import { WrenBird, wrenPoses, type WrenPose } from "@helpwren/design-system";
import { useRef } from "react";

import { useChatOpens } from "@/components/live-widget";
import { gsap, MotionPathPlugin, ScrollTrigger, useGSAP } from "@/motion/kit";
import { afterScroll } from "@/motion/scroll-sync";

import { arrivals, flightAt, routePoints, routeSegments, smoothPath, type Stop } from "./route";

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

/** How many points each leg is sampled at, for placing the wren by height. */
const LEG_SAMPLES = 48;

/**
 * The length along a leg at which the route is at the height `along` of the way from one stop
 * to the next. Only for legs that mostly go down or up; null otherwise, to place by length.
 */
function lengthFor(
  samples: { length: number; y: number }[] | undefined,
  fromY: number,
  toY: number,
  along: number,
): number | null {
  const first = samples?.[0];
  const last = samples?.[samples.length - 1];
  if (!samples || !first || !last || Math.abs(toY - fromY) < 1) return null;
  if (along <= 0) return first.length;
  if (along >= 1) return last.length;
  const target = fromY + (toY - fromY) * along;
  const down = toY > fromY;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (!a || !b) continue;
    if (down ? b.y >= target : b.y <= target) {
      const span = b.y - a.y;
      const t = span === 0 ? 1 : Math.min(1, Math.max(0, (target - a.y) / span));
      return a.length + (b.length - a.length) * t;
    }
  }
  return last.length;
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
    if (pinned) {
      const top = pinned.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(0, pinned.offsetHeight - window.innerHeight);
      const stuck = Math.min(range, Math.max(0, window.scrollY - top));
      const siblings = [...pinned.querySelectorAll("[data-wren-perch]")];
      const share = siblings.length > 1 ? siblings.indexOf(mark) / (siblings.length - 1) : 0;
      pin = { top, range, baseY: y - stuck };
      y = y - stuck + share * range;
      arriveAt = top + share * range;
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
      // For each leg, points sampled along it, so the wren can be placed by how far down the page
      // it should be rather than by how far along the curve: on a leg that starts sideways, it
      // keeps pace with the scroll instead of falling behind.
      const legSamples = stops.slice(0, -1).map((_, leg) => {
        const start = atStop[leg] ?? 0;
        const end = atStop[leg + 1] ?? start;
        return Array.from({ length: LEG_SAMPLES + 1 }, (_, i) => {
          const length = start + ((end - start) * i) / LEG_SAMPLES;
          return { length, y: path.getPointAtLength(length).y };
        });
      });
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
        const length =
          lengthFor(legSamples[leg], from.y, to.y, along) ??
          startLength + (endLength - startLength) * along;
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
          else if (hopDy < 0)
            pose = Math.floor(performance.now() / FLAP_MS) % 2 ? "wings-up" : "wings-down";
          else pose = "gliding";
        }
        const size = Math.max(MIN_SIZE, from.size + (to.size - from.size) * along);
        // At the birdhouse it hops in through the door, and comes out again for the next leg.
        wren.style.opacity = here === "home-range" ? "0" : "1";
        wren.dataset.pose = pose;
        wren.style.width = `${String(size)}px`;
        wren.style.height = `${String(size)}px`;
        wren.style.transform = `translate(${String(x - size * FOOT_X)}px, ${String(y - size * FOOT_Y)}px) rotate(${String(direction * tilt)}deg) scaleX(${String(direction)})`;
        gsap.set(path, { drawSVG: `0 ${String(progress * 100)}%` });
      };

      const proxy = { scroll: window.scrollY };
      render(proxy.scroll);
      tween = gsap.to(proxy, {
        scroll: maxScroll,
        ease: "none",
        onUpdate: () => {
          render(proxy.scroll);
        },
        scrollTrigger: { start: 0, end: maxScroll, scrub: SCRUB },
      });
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
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", follow);
      stopFollowing();
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
          <path
            ref={trail}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeLinecap="round"
            strokeDasharray="0"
            opacity={0.45}
          />
        </svg>
        <div
          ref={bird}
          data-pose="perched"
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
    </div>
  );
}
