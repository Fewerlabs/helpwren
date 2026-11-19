"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { gsap, ScrollTrigger } from "./kit";

/** How far each frame Lenis closes the gap to the target scroll position. Lower is smoother. */
const SMOOTHING = 0.12;
/** Milliseconds in a second: GSAP's ticker counts seconds, Lenis milliseconds. */
const MS = 1000;

/**
 * Starts the page's motion: smooth scrolling driven by GSAP's ticker, so there is one animation
 * loop, and the `data-motion="on"` mark that lets hidden starting states apply. Undoes all of it
 * when it unmounts, such as when the footer switch turns animations off.
 */
export function MotionEngine() {
  useEffect(() => {
    const root = document.documentElement;
    const lenis = new Lenis({ lerp: SMOOTHING, autoRaf: false });
    const raf = (time: number) => {
      lenis.raf(time * MS);
    };
    lenis.on("scroll", () => {
      ScrollTrigger.update();
    });
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    root.dataset.motion = "on";

    // Fonts change line lengths, and with them where every trigger sits.
    void document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
