# The landing page: how it works

`apps/site` is the website at `helpwren.fewerlabs.dev`: a field journal about one small bird,
with the wren flying from entry to entry as you scroll. This explains how the motion works, how to
add an entry, how the product pictures are made, and how it deploys. The decisions behind it are
in [ADR 0025](../decisions/0025-landing-page.md); the plan in [plan.md](plan.md); the checklist
against the brief in [spec-check.md](spec-check.md).

```bash
pnpm --filter @helpwren/site dev        # http://localhost:3210
pnpm --filter @helpwren/site build && pnpm --filter @helpwren/site start
```

## Layers, from the bottom up

The page is complete without any of the motion: static HTML from the build, every drawing drawn,
a still wren standing at every perch. Each layer below only adds to that.

1. **Drawings draw themselves, with CSS.** Every drawing is a design-system illustration
   (`Wren`, `Sketch`, `WrenBird`) with `animate="in-view"`. It waits undrawn below the screen,
   draws in (stroke offsets) as it scrolls into view, then lives quietly: leaves sway, the wren
   blinks and tilts its head. Small movements pause off screen. A drawing already on screen when
   the page opens is not redrawn. This needs no JavaScript beyond a tiny IntersectionObserver.
2. **The motion layer, after the page settles** (`src/motion`). Once the page has loaded, 300ms
   have passed and the browser is idle (`useIdle`, `useMotionReady` in `preference.ts`), and only
   if motion is allowed, `next/dynamic` fetches GSAP and Lenis:
   - `engine.tsx`: Lenis smooth scrolling, driven by GSAP's ticker
     (`lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`,
     `lagSmoothing(0)`), then `runAfterScroll()` for anything that must move in the same frame.
   - `helpers.ts`: the shared motion: `revealHeading` (SplitText, lines rising through a mask),
     `riseIn` (tags), `tapeDown` (tape), `entryTimeline` (plays once on entry, or not at all if
     already seen).
   - Each entry's `sections/<entry>/motion.tsx` loads its `timeline.tsx` through `MotionGate`;
     the timeline's `useSectionTimeline` runs inside `useGSAP`, so everything it makes is
     reverted when it unmounts.
3. **The wren** (`src/wren`). On screens 768px and wider, `flight-layer.tsx` loads `flight.tsx`:
   one wren in a fixed, `pointer-events: none` layer. It reads every `[data-wren-perch]` and
   `[data-wren-waypoint]` in the page, builds one smooth path through them (`route.ts`),
   rebuilt on resize and font load, and follows the scroll with a scrubbed ScrollTrigger.
   Positions come from MotionPathPlugin; the trail is drawn with DrawSVGPlugin. It holds at each
   perch, flaps while climbing, glides down, lands feet first, tilts no more than 18 degrees and
   sleeps on the footer branch. When it lands it sets `data-wren-here` (and `data-wren-visited`)
   on the entry, which the stylesheet uses for the entry's small action. Below 768px the still
   wrens stay at their perches.
4. **Three.js** (`src/scenes`). The hero and the anatomy entry wrap their drawing in
   `SceneSlot`. On capable devices (WebGL2, 768px+, 4 cores, 4 GB, no data saver), near the
   viewport, it loads the scene's own chunk: the same lines in 3D with fat lines and a boil in
   the line shader. The drawing fades only after the first frame.
5. **The real widget** (`components/live-widget.tsx`). With `NEXT_PUBLIC_HELPWREN_DEMO_URL` set,
   the widget script loads from that install once the page is idle, and entry 05 can open it.
   The wren hops each time the chat opens.

Reduced motion, or the footer's **Animations** switch (remembered in `localStorage`, applied
before paint by `motion/script.ts`), stops layers 2 to 4 entirely and shows every drawing
finished and still.

## Add an entry

1. Make `src/sections/<name>/<name>.tsx` with `Entry` from `components/journal.tsx`: number,
   subject, the field note (a label, never invented data), title, the writing, and a `sketch`.
2. Draw the sketch with `Sketch` (or a design-system `Wren` scene) with `animate="in-view"`, and
   give each path `pathLength={1}`. Classes `hw-leaf`, `hw-grass`, `hw-pen`, `hw-hl` and
   `hw-settle` give it life.
3. Mark where the wren lands with `<Perch name="<name>" x={…} y={…} />` inside the sketch's
   `@container` (percentages of the drawing; the feet land on the point). For a fly-through
   without landing, use an empty `<span data-wren-waypoint="<name>">`.
4. Copy `motion.tsx` and `timeline.tsx` from another entry, and call `revealEntry(section)` plus
   anything of your own from `helpers.ts`. Name every number as a constant.
5. Put it in `src/app/page.tsx` in order. The route picks up the perch by itself.
6. Check the copy against what is built, and run `pnpm --filter @helpwren/site test`.

## Product pictures

Every picture of the product is a capture of the running app, never a drawing of it:
`public/captures/{widget,conversation,inbox,help}-{light,dark}.{avif,webp}`, at 2x.

```bash
# A Supabase stack with the demo data, and apps/web built and started against it, then:
HELPWREN_APP_URL=http://localhost:3000 MAILPIT_URL=http://127.0.0.1:54324 \
  pnpm --filter @helpwren/site capture
```

The script signs in as the demo admin and sends one message as a guest, so run it against demo
data only. To keep your usual local database untouched, start a second stack from a copy of
`supabase/` with another `project_id` and ports, as was done for these captures.

## Deploy on Vercel

A Vercel project of its own:

| Setting         | Value                                    |
| --------------- | ---------------------------------------- |
| Root directory  | `apps/site`                              |
| Framework       | Next.js (detected)                       |
| Install command | default (pnpm, from the repository root) |
| Build command   | default (`next build`)                   |
| Output          | default                                  |
| Node.js         | 26                                       |

Environment variables:

| Variable                        | Required | What it does                                                                                                                                               |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_HELPWREN_DEMO_URL` | No       | A live demo install, such as `https://demo.helpwren.fewerlabs.dev`. Its widget loads on the page. Add the site's domain to that install's allowed domains. |

Without it the page shows the captures only. The GitHub star count is read at build time and left
out below ten stars or on any failure.

## Measured

On the production build, Lighthouse 13.5 (mobile, simulated slow 4G and 4x CPU): Performance 94,
Accessibility 100, Best Practices 100, SEO 100; CLS 0, TBT 60ms; LCP 2.9s simulated (observed
under 0.1s locally; the simulation counts the framework's JavaScript). Desktop: 99/100/100/100.
Scrolling the whole page with the CPU slowed 4x: 57 fps, 2 frames over 50ms.
