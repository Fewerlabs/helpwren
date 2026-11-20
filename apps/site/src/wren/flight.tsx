"use client";

import { WrenBird, wrenPoses, type WrenPose } from "@helpwren/design-system";
import { useRef } from "react";

import { gsap, MotionPathPlugin, useGSAP } from "@/motion/kit";

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
    stops.push({
      name: mark.dataset.wrenPerch ?? mark.dataset.wrenWaypoint ?? "",
      x: box.left + window.scrollX,
      y: box.top + window.scrollY,
      size,
      land: mark.dataset.wrenPerch !== undefined,
      pose: mark.dataset.pose === "asleep" ? "asleep" : "perched",
      facing: mark.dataset.facing === "left" ? "left" : "right",
    });
  }
  return stops;
}

/**
 * The one flying wren: a layer over the whole page holding the pencil trail and the bird, which
 * follows the scroll from perch to perch. It never moves the page; the page moves it.
 */
export function WrenFlight() {
  const layer = useRef<HTMLDivElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const bird = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = document.documentElement;
    let tween: gsap.core.Tween | null = null;
    let timer = 0;

    const build = () => {
      tween?.kill();
      const stops = measureStops();
      const svgLayer = layer.current;
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
        const length = startLength + (endLength - startLength) * along;
        const progress = total > 0 ? length / total : 0;
        const point = MotionPathPlugin.getPositionOnPath(raw, progress, true);
        const angle = "angle" in point && typeof point.angle === "number" ? point.angle : 0;
        const radians = (angle * Math.PI) / 180;
        const dx = Math.cos(radians);
        const dy = Math.sin(radians);
        const sitting = along <= 0 || along >= 1;
        const stop = along >= 1 ? to : from;

        // Tell the entry the wren has landed in it, so it can do its small thing.
        const here = sitting && stop.land ? stop.name : "";
        if (here !== landedAt) {
          if (landedAt)
            document
              .querySelector(`[data-wren-perch="${landedAt}"]`)
              ?.closest("[data-entry], footer")
              ?.removeAttribute("data-wren-here");
          if (here)
            document
              .querySelector(`[data-wren-perch="${here}"]`)
              ?.closest("[data-entry], footer")
              ?.setAttribute("data-wren-here", here);
          landedAt = here;
        }

        let pose: WrenPose;
        let direction: number;
        let tilt = 0;
        if (sitting) {
          pose = stop.land ? stop.pose : "gliding";
          direction = stop.facing === "left" ? -1 : 1;
        } else {
          direction = dx < 0 ? -1 : 1;
          tilt = gsap.utils.clamp(
            -MAX_TILT_DEG,
            MAX_TILT_DEG,
            (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI,
          );
          if (along > 1 - LANDING_SHARE && to.land) pose = "landing";
          else if (dy < 0)
            pose = Math.floor(performance.now() / FLAP_MS) % 2 ? "wings-up" : "wings-down";
          else pose = "gliding";
        }
        const size = Math.max(MIN_SIZE, from.size + (to.size - from.size) * along);
        // At the birdhouse it hops in through the door, and comes out again for the next leg.
        wren.style.opacity = here === "home-range" ? "0" : "1";
        wren.dataset.pose = pose;
        wren.style.width = `${String(size)}px`;
        wren.style.height = `${String(size)}px`;
        wren.style.transform = `translate(${String(point.x - size * FOOT_X)}px, ${String(point.y - size * FOOT_Y)}px) rotate(${String(direction * tilt)}deg) scaleX(${String(direction)})`;
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
    build();
    void document.fonts.ready.then(build);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      tween?.kill();
      delete root.dataset.wren;
    };
  });

  return (
    <div
      ref={layer}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-30 overflow-hidden"
    >
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
          <WrenBird key={pose} pose={pose} data-flyer-pose={pose} className="absolute inset-0" />
        ))}
      </div>
    </div>
  );
}
