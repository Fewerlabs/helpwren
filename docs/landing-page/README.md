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
3. **The wren** (`src/wren`). From 640px wide, `flight-layer.tsx` loads `flight.tsx`: one
   wren, 88px from 1024px and 64px below, drawn frame by frame from the design system's
   `wrenFrame` (the logo's wren at four angles: side, three-quarter front, front, three-quarter
   back; an eight-frame wing beat, a glide and a landing flare; perched idles). It reads every
   `[data-wren-perch]` and `[data-wren-waypoint]` and every heading, paragraph, caption, list
   item and code block, then finds each leg's way round the words (`corridor.ts`: a grid search
   through the page margins and the gaps between blocks, pulled straight and rounded). The page
   margins are kept wide enough for the wren from 640px (`.page-gutters`). The whole page,
   top to bottom, maps onto the route with a scrubbed ScrollTrigger (`route.ts` says when the
   wren is where), so a reload part way down or a resize puts it where the scroll says; the route
   is measured again on resize, font load, every ScrollTrigger refresh and any change in the
   page's height. The wren stays below the sticky header and inside the screen by moving along
   its way, never off it. The frames run on their own clock at 12 a second, so the wings keep
   beating when the scroll stops; the angle follows the direction of flight and changes only
   between wingbeats; it tilts at most 15°. It crouches before take-off, springs off, flares to
   land and settles with a squash, and while perched blinks, looks round, tilts its head, preens
   and hops at uneven intervals. On the growth entry (from 1280px, where the entry is pinned) it
   hops up one branch per step; it carries the plug on the leg into the nest, goes into the
   birdhouse at home range and sleeps on the footer branch. There is no trail: the route is
   data only. Below 640px the still wren at each perch flies a short way in and lands as its
   entry reaches the middle of the screen (CSS).
4. **The overlap check** (`scripts/overlap-check.mjs`, `pnpm --filter @helpwren/site check:wren`
   against a running build) scrolls the page in 20px steps at the widths given and fails if the
   wren's box touches any heading, paragraph, caption, list item or code block, or leaves the
   screen while flying.
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

On the production build, Lighthouse 13.5 (mobile, simulated slow 4G and 4x CPU): Performance 94,
Accessibility 100, Best Practices 100, SEO 100; CLS 0.001, TBT 60ms; LCP 2.9s simulated. Desktop:
100/100/100/100, LCP 0.6s. JavaScript before the load event: 158 KB compressed, of which React DOM
and the Next.js runtime are about 125 KB; the icon set is no longer part of it (the theme menu and
the snippet import their few icons one by one, and load on use). The overlap check passes at 640,
800, 900, 1024, 1280, 1366 and 1440, light and dark ([overlap-check.txt](overlap-check.txt)), and
the stress test (reloads at five depths, resizes, anchor jumps, flicks, at 800, 1024, 1280 and 1440) keeps the wren on screen, off the words and the page in place; see
[spec-check.md](spec-check.md).
