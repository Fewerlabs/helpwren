"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/*
 * GSAP and its plugins, registered once. Only modules loaded with next/dynamic import this file,
 * so GSAP is never part of the page's first download. GSAP is under its own licence (see ADR
 * 0025): keep it inside apps/site.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText, useGSAP };
