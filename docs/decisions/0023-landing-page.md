# 0023: The website at helpwren.fewerlabs.dev

- **Status:** accepted
- **Date:** 2026-11-19

## Context

Helpwren needs a home page: what it is, what it does, how to install it. The brief
(`docs/landing-page/plan.md`, approved) asks for a scroll-driven field journal with the wren
flying from entry to entry, while staying fast, accessible and complete without JavaScript or
motion. The site must not touch the product: no Supabase, no shared state, and nothing in a
published package that the product's MIT licence cannot carry.

## Decision

### The app

- **A separate Next.js app, `apps/site`** (`@helpwren/site`), private, on Next.js 16.4 with the
  App Router, React 19.3, Tailwind 4 and `@helpwren/design-system`. It is ignored by changesets,
  like `apps/web`.
- **Hosted on Vercel as its own project, with plain static generation, not `output: "export"`.**
  Every route is prerendered at build (`dynamic = "force-static"`), so the result is as static as an
  export, but Vercel can apply the headers set in `next.config.ts` and serve the generated Open
  Graph images. Nothing runs per request.
- **The GitHub star count is read at build time**, with a four-second timeout, and left out on any
  failure or below ten stars. The build never fails because of GitHub.
- **The theme control moved into the design system** (`ThemeMenu`, `ThemeSwitch`, the hooks and
  `themeScript`), so the app and the site share one implementation. `themeScript` takes the paths
  it applies to; the app limits it to its own public pages, the site applies it everywhere.

### Motion

- **GSAP 3.15** with `@gsap/react` 2.1 (`useGSAP`), ScrollTrigger, MotionPathPlugin, DrawSVGPlugin
  and SplitText, all from the public `gsap` package.
- **Licence.** GSAP is free under Webflow's Standard "No Charge" licence (effective 30 April 2025,
  https://gsap.com/standard-license): free for commercial websites, all plugins included, not open
  source, and not for no-code animation builders that compete with Webflow. **GSAP stays inside
  `apps/site`.** It must never be added to a published Helpwren package (the widget, the React
  Native screen, the design system), whose MIT licence it cannot carry.
- **Lenis 1.3, not ScrollSmoother,** for smooth scrolling. Both keep native scroll. ScrollSmoother
  moves the content with a transform, which breaks `position: sticky` and `fixed` inside it, and
  says nothing about reduced motion. Lenis keeps both working, turns smoothing off for people who
  prefer reduced motion, leaves touch scrolling native, and runs from GSAP's ticker, so there is one
  animation loop.
- **The motion layer is loaded after the page is interactive** and not at all for people who prefer
  reduced motion or who turned animations off in the footer. Hidden starting states exist only under
  `html[data-motion="on"]`, which the motion layer sets, so the page is complete without it.

### Three.js

- **three 0.187, @react-three/fiber 9.8 and @react-three/drei 10.7,** for two moments only: the
  hero's branch in perspective and the exploded stack in the anatomy entry. Lines only, through
  drei's `Line` (fat lines, `Line2`), in the ink token; no lights, materials or textures.
- **Each scene is its own chunk,** loaded near the viewport on capable devices (WebGL2, at least
  768px wide, not `saveData`, at least 4 cores and, where reported, 4 GB of memory), over a still
  SVG of the same drawing. If the anatomy scene costs too much, the still SVG stack is the fallback
  for everyone.
- React Three Fiber 9.8 declares `react >=19 <19.4`. Raise the React catalog past 19.3 only with a
  Fiber release that allows it.

## Consequences

- The site builds and deploys on its own. Vercel needs the root directory `apps/site`; the
  workspace is installed from the repository root with pnpm.
- Every claim on the page was checked against the code. When a feature ships or changes, the page
  copy in `apps/site/src/sections` needs the same review; a test fails if a phrase for an unbuilt
  feature (headless, one command, ten minutes) appears.
- Two non-MIT pieces live in the repository (GSAP and its React hook), both confined to the
  website.

## References

- [Landing page plan](../landing-page/plan.md)
- [GSAP Standard License](https://gsap.com/standard-license)
- [GreenSock's agent skills](https://github.com/greensock/gsap-skills) and
  [docs for language models](https://gsap.com/llms.txt)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
- [drei Line](https://drei.docs.pmnd.rs/shapes/line)
