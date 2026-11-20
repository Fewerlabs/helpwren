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
   - `entry-motion.tsx`: one component every entry renders (through `Entry`); its timeline
     runs `revealEntry` inside `useGSAP`, so everything it makes is reverted on unmount.
   - `components/entry-watch.tsx`: marks each entry `data-in-view`, once, when its top reaches
     the line where the wren lands (45% down the screen), or at once if the page opens below it.
     Entry actions (the price struck out, the plug pushed into the socket, the snippet typed)
     key off that, never off the wren, so jumping past an entry still shows it complete.
3. **The wren** (`src/wren`). From 1024px wide (the two-column layout), `flight-layer.tsx`
   loads `flight.tsx`. It reads every `[data-wren-perch]` and `[data-wren-waypoint]`, builds one
   smooth path through them (`route.ts`), and maps the whole page, top to bottom, onto it with a
   scrubbed ScrollTrigger, so a reload part way down or a resize puts the wren where the scroll
   says. It is placed by arc length (continuous: no jumps) and held inside the screen's edges. It
   holds at each perch for about a third of the next leg, hops up the pinned growth entry one
   branch per step and sits on the top branch until the entry lets go, and flies through the
   anatomy gap. The flight writes each frame to `state.ts`; on capable devices `wren-3d.tsx` draws
   it in 3D (ink outlines on paper: body, head, tail, wings with shoulder, elbow and wrist), with
   a procedural rig: wing beats with follow-through, bob, tail fanning, head looking ahead and at
   the reader, blinks, hops, preening; banking, climbing, gliding and a landing flare, all through
   springs. Elsewhere the SVG `WrenBird` poses fly instead. The pinned entry's height is reserved
   in CSS before paint (`html[data-motion-pref="on"]`), so nothing shifts.
4. **One canvas** (`src/scenes/scene-canvas.tsx`). The page has a single WebGL canvas, fixed
   over the screen. The hero's branch, the anatomy stack and the wren are drei Views: DOM
   elements whose 3D content that canvas draws, scissored to them. Scenes load near the viewport
   on capable devices (WebGL2, 768px+, 4 cores, 4 GB, no data saver), over the still SVG of the
   same drawing, which fades only after the first frame. Frames are drawn on demand: on scroll,
   while the wren moves, and for its idle life.
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
4. If the entry does something of its own, key it off `[data-entry="<name>"][data-in-view]` in
   `globals.css` (or add to `revealEntry`). Name every number as a constant.
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

On the production build, Lighthouse 13.5 (mobile, simulated slow 4G and 4x CPU): Performance 93,
Accessibility 100, Best Practices 100, SEO 100; CLS 0, TBT 70ms; LCP 3.1s simulated (observed
under 0.1s locally; the simulation counts the framework's JavaScript). Desktop: 98/100/100/100.
Scrolling the page with the CPU slowed 4x and no WebGL: 57 fps. The stress test (reloads at five
depths, resizes, anchor jumps, flicks, at 375, 768, 1280 and 1440) keeps the wren on screen and the
page in place throughout; see [spec-check.md](spec-check.md).
