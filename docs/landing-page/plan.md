# Helpwren landing page: phase 0 plan

Status: draft for the owner's approval. Nothing is built yet; no app, no dependencies.

This is the research and creative plan the landing-page brief asks for in phase 0. It covers the
art direction, the storyboard, the scroll timeline, the wren's route and poses, the two Three.js
moments, the tools and the performance plan. It ends with the product claims that had to change
and the questions that need an answer before phase 1.

Sources read: the landing-page brief, the build plan (sections 1, 4.0, 4.10, 4.13, 4.14, 9 and
11), `docs/brand/`, `docs/design-system.md`, ADRs 0001 to 0021, `packages/design-system`
(tokens, theme, the wren scenes and `Logo`), and the code in `apps/web` and `packages/*`.

A rough sketch of the hero and one journal entry, in light and dark, is in
[`sketches/hero-and-entry.html`](sketches/hero-and-entry.html). Open it in a browser.

---

## 1. What changed since the brief

The brief was written for the first look of the product: warm paper, a dotted grid, moss
everywhere. The product has moved on, and the page follows the product as it is now.

| The brief says                            | The product now                                                                                                                            | What the page does                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Warm paper (`#f4f4ef`), soft page edges   | Plain greys with no tint: `--paper #f7f7f7`, `--canvas #f3f3f3`, white `--card-surface`, ink `#1a1a1a` (`tokens.css`)                      | The journal is white sheets on a light-grey ground. No warmth, no texture. See 2.2                            |
| Moss for living things and accents        | The brand colour is for accents only                                                                                                       | Green appears in four places only: the filled button, leaves in the sketches, the halftone and the focus ring |
| No mention                                | Public pages (chat page, help center) have a halftone of brand-coloured dots that fades out from a top corner (`page-halftone.tsx`)        | The halftone is the journal's "printed plate": hero corner, the field-guide plate and the last entry          |
| Primary buttons in the accent             | Filled buttons are deep green with white words in both themes (`--primary-fill`, commit `0c44f9d`)                                         | Use `Button` as it is. The "Install" button is the one filled thing on each screen                            |
| Body type unspecified                     | Articles use Notion-like sizes: 16px body at 1.5, headings 30, 24 and 20px, title 32px on a phone and 40px wider                           | Body copy and entry titles use the article scale. Only the hero headline goes larger                          |
| No theme control                          | Light, dark and system, in the account menu and on the chat page (`features/theme`, `lib/theme.ts`, an inline script so there is no flash) | The site has the same three-way control in its header, and the journal has a night version (2.3)              |
| Lucide icons                              | Phosphor, through the design system's `Icon`                                                                                               | Use `Icon`                                                                                                    |
| "Contextual help", "headless", live check | Not built yet (section 7)                                                                                                                  | Rewritten or marked as later                                                                                  |

`docs/design-system.md` still lists the old warm hex values (`#F7F4ED`, `#1C1A16`). `tokens.css`
is the source of truth, and the doc should be corrected separately.

---

## 2. Art direction: a field journal in ink on white

### 2.1 The idea, kept

The page is a naturalist's field journal about one small bird. Each section is an entry recording
a sighting of the wren doing something Helpwren does. The wren flies from entry to entry along an
ink path, lands in each entry's sketch, does one small thing and takes off. A thin pencil trail
stays behind it, so the whole route can be seen by the end.

The journal is a frame, not a costume. The interface inside it (buttons, the snippet, the demo
widget) is the design system as it is, and it reads at a glance.

### 2.2 How the paper reads on plain white

There is no paper texture and no warmth to lean on, so the journal comes from structure and marks,
not from a material.

- **Ground and sheets.** The page background is `--paper` (`#f7f7f7`). Each entry is a sheet: a
  white `--card-surface` panel with a 1.5px `--rule` edge (the product's `--line`), `--radius-2xl`
  corners and no shadow, exactly like the help center's cards. On wide screens an entry is a
  two-page spread: one white panel with a hairline `--rule` gutter down the middle, text on one
  page and the sketch on the other. On a phone a spread folds into one page.
- **The margin.** Every sheet has a narrow left margin with the entry header in JetBrains Mono at
  `text-2xs`, uppercase, `--pencil`, letter-spaced: `ENTRY 03 · INSTALL · ONE SNIPPET`. It is the
  only "notebook" device on the sheet itself.
- **Marks carry the journal.** Ink lines in `currentColor` (so they turn pale in dark mode), leader
  lines to handwritten labels in Caveat (`--pencil`), red pen (`--pen`) for the observer's circles,
  arrows and notes, highlighter (`--highlighter`) behind one key word per headline with
  `--highlighter-foreground` on top. The red pen and the highlighter are the only warm colours on
  the page, and they are already tokens.
- **Tape.** The snippet, the demo widget and screenshots look taped in: two short strips at
  opposite corners, `--highlighter` mixed to about 45% with transparent, rotated 3 to 6 degrees.
  The taped item itself is not rotated, so it stays crisp and readable.
- **Specimen tags.** Features and levels are tags: a rounded rectangle with a punched hole and a
  thin string drawn in ink, a mono name and a one-line description. They are `--card-surface` with
  an `--edge` outline, so they read as the product's cards with a hole in them.
- **Halftone as print.** Old field guides printed their plates in halftone. The page uses the
  existing pattern (brand dots at 55%, 7px grid, faded on every side) in three places only: the top
  corner of the hero, behind the field-guide plate in entry 06, and behind the last entry. Never
  behind body text at full density; the fade keeps it to the edges.
- **No ruled lines, no grid, no stains, torn edges or ageing.**

### 2.3 Dark mode: the journal at night

Dark mode is not an inverted page; it is the same journal read by lamplight.

- Ground `#0c0c0d`, sheets `#161616`, rule `#262626`, ink `#e5e5e5`, all from `.dark` in
  `tokens.css`. The ink sketches follow `currentColor` and turn pale.
- Red pen becomes `#f07a5a`, highlighter `#e8c64a` with near-black words on it, moss `#7fb59a`
  for leaves. The filled button stays deep green with white words.
- Tape is the dark highlighter mixed down to about 30%, so it glows less than in daylight.
- The halftone keeps the brand colour; on the dark ground it reads as faint green dots.
- The Three.js scenes read `--ink` and `--paper` from the document when they start and again when
  the theme class changes, so the 3D lines match the SVG lines exactly.

### 2.4 Type

- Headlines: Figtree 600, tight tracking (`-0.035em`, as the wordmark). Hero 40px on a phone,
  56 to 64px wide. Entry titles at the article `h1` size (32/40px).
- Body: the article scale, 16px at 1.5, short lines (about 60 characters).
- Entry headers, tags and code: JetBrains Mono.
- Margin notes: Caveat, only beside drawings, never in the interface (the design-system rule).

### 2.5 Reference descriptions

These describe the qualities to borrow. Nothing is copied.

1. **A bird field guide plate** (Sibley, Collins). Several small studies of one bird on a plain
   page, each with a leader line to a short label, in a fixed order. Entry 06 is laid out this way:
   six features in a regular grid with labels on leader lines.
2. **Museum specimen tags.** A small card on a string with a name in capitals and one line below.
   Gives us a way to show levels and features without bullet lists.
3. **Notion's illustrations.** Black ink line drawings, very little colour, lots of white. The
   model for the sketches and the restraint of colour.
4. **Excalidraw's line.** Slightly imperfect strokes that still feel precise. The existing
   `feTurbulence` wobble on the wren scenes already does this.
5. **A pocket memo book** (Field Notes). Small mono labels in the corner of each page: entry
   number, subject, a short "where and when" line. Our entry headers.
6. **Featurebase's landing page**, for layout and rhythm only (owner's standing direction): a large
   centred headline with two buttons, generous vertical spacing, product UI shown in a frame, a
   feature grid. The journal sits on that skeleton.

---

## 3. Storyboard

Copy rules from the brief stand: plain short sentences, no exclamation marks, no invented stats,
logos, testimonials or star counts. Every claim below was checked against the code (section 7).

| #   | Entry                              | Content                                                                                                                                                                                                                                                                                                                       | The wren and the page                                                                                                                                                                        | Change from the brief, and why                                                                                                                                                                                 |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero · Entry 01 "First sighting"   | "Live chat, tickets and help articles that plug into any product." Sub: "Open source and self-hosted. Your database, no per-seat pricing." Buttons: primary to the setup guide, outline "View on GitHub". A small status tag: `EARLY · NOT YET RELEASED` (see Q1)                                                             | The wren draws itself in on a branch beside the headline. Red pen circles "plug into", the highlighter swipes "any product". Halftone in the top corner. A 3D line-drawn branch scene behind | Install button points to a guide, not an installer, because the one-command installer is a stub. Status tag added so the page does not imply a release                                                         |
| 2   | Entry 02 "Habitat under threat"    | "Most support tools charge for every seat and keep your conversations on their servers." No product names, no prices                                                                                                                                                                                                          | The wren lands on a hanging price tag reading `per seat / month`; red pen scribbles it out                                                                                                   | None. Kept generic so it is fair and true                                                                                                                                                                      |
| 3   | Entry 03 "Building the nest"       | The real snippet from Settings → Installation: `<script src=".../widget.js">` and `Helpwren.init({ source: "web" })`, typed out, with tabs for HTML, React and Next.js. Text: "Paste one snippet. Settings → Installation writes it for you with your address in it. Guest chat works at once."                               | The wren carries the plug into the socket ("plugs-in" scene), red-pen sparks, then the taped-in code block types out                                                                         | Header reads `ONE SNIPPET`, not `TIME TO FIRST CHAT: ~10 MIN`: the ten minutes is a target nobody has timed yet. The "live install check" is dropped: it is not built                                          |
| 4   | Entry 04 "Growth stages"           | Four tags on rising branches. 0: deploy, paste the snippet: guest chat, help center, inbox. 1: one `identify` call: agents see who they are talking to; or a signed token so history follows the user. 2: the mobile screen: chat and help inside your app. 3: push (Expo, Firebase or a webhook) and email: people hear back | Pinned. The wren hops up one branch per scroll step; each tag draws in as it lands                                                                                                           | Level 3 says "push and email", not "push or webhooks": general event webhooks are not built, only a push webhook                                                                                               |
| 5   | Entry 05 "Observed in the wild"    | A working mini widget built from design-system components, taped in: the home screen with "Suggested articles", open one, then send a message and get a canned reply. Labelled "Demo. Replies are pre-written."                                                                                                               | The wren perches on the launcher, then the red pen draws an arrow to "Suggested articles"                                                                                                    | "Help for this page" becomes "Suggested articles": articles matched to the page are not built; suggested (featured) articles are                                                                               |
| 6   | Entry 06 "Field guide: behaviours" | A plate of six specimens: Live chat · Tickets (numbers, priority, internal notes) · Help center (search, ranks on Google, embeds in your site) · Mobile screen (React Native) · Notifications (push and email) · Knows who's asking (identify, page context for agents, live visitors)                                        | Each specimen sketch draws in as it enters with a Caveat label; the wren skims across the plate without landing. Halftone behind the plate                                                   | "Contextual help" and "headless" are replaced by "Mobile screen" and "Knows who's asking". Both replaced items are not built (7.2)                                                                             |
| 7   | Entry 07 "Anatomy"                 | An exploded study of how it is built today, four planes: the widget script (a launcher in a shadow root) · the chat page in a frame · the client library · your Supabase (Postgres, Realtime, Storage). Red-pen margin note: "the library and API become public later, so you can build your own interface"                   | 3D: four line-drawn planes separate as you scroll, with leader-line labels; the wren flies through the gap                                                                                   | The brief's layers (widget, components, client library, API) are the planned public packages; only the widget is real today. The stack shown is the one that exists. Headless is a clearly marked "later" note |
| 8   | Entry 08 "Home range"              | "One install per product, on your own address. Your data stays in your database. No per-seat pricing. MIT licensed."                                                                                                                                                                                                          | The wren lands on the birdhouse roof ("self-hosted" scene) and goes inside                                                                                                                   | Adds "MIT licensed": the licence is now decided (`LICENSE`)                                                                                                                                                    |
| 9   | Last entry "Join the survey"       | Links: GitHub, the docs in the repository, Contributing, Licence. Footer: theme control, "Animations on/off", Fewer Labs                                                                                                                                                                                                      | The wren comes out, settles on a branch in the footer and falls asleep. Red-pen note: "more sightings in the repo". Halftone behind                                                          | The sleeping pose is new; the "offline" scene is a snapped wire, not a sleeping bird                                                                                                                           |

Hero headline alternatives, if the owner wants options: "Live chat, tickets and a help center for
your product. On your own servers." / "Support that plugs into your product, and stays yours."

---

## 4. Scroll timeline per section

Two kinds of motion:

- **Scrubbed**: tied to the scroll position, reversible. Only the wren's flight, the trail and the
  two pinned sections.
- **Played**: runs once when its section comes into view (`toggleActions: "play none none none"`).
  Draw-ins, pen marks, highlighter, headline reveals. They do not replay on the way up, so marks
  never flicker.

Start and end are ScrollTrigger positions (`element viewport`). Durations are in seconds for
played motion. All values become named constants in phase 2.

| Section         | Trigger and range                                            | Played                                                                                                                                      | Scrubbed                                                                                     |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1 Hero          | On load, no trigger                                          | Headline lines rise in through a line mask (SplitText, 0.6s, 0.08s stagger). Wren draws in (1.2s). Pen circle 0.5s, highlighter 0.4s, after | Leaving the hero (`top top` to `bottom top`): 3D camera drifts down a little; wren takes off |
| 2 Habitat       | `top 70%`                                                    | Price tag swings in (rotation settle, 0.6s); after the wren lands, red scribble draws (DrawSVG, 0.5s)                                       | Flight hero to tag                                                                           |
| 3 Nest          | `top 65%`                                                    | Plug slides to socket (0.5s), sparks (0.2s), tape strips pop in, code types (about 20 characters per frame-step, under 1.5s in total)       | Flight tag to plug                                                                           |
| 4 Growth stages | Pinned `top top` to `+=300%` (four steps of 75% of a screen) | Each tag draws in when the wren reaches its branch                                                                                          | Wren hops branch to branch, snapping to the four steps (`snap` to labels)                    |
| 5 In the wild   | `top 60%`                                                    | Widget tape-in, then pen arrow (0.6s). The demo itself is interactive, not animated by scroll                                               | Flight to the launcher                                                                       |
| 6 Field guide   | Each specimen `top 85%`                                      | Sketch draws in (0.9s), label fades (0.2s), 0.1s stagger across a row                                                                       | Wren skims a shallow arc across the plate                                                    |
| 7 Anatomy       | Pinned `top top` to `+=150%`                                 | Leader labels appear as each plane settles                                                                                                  | Planes separate from flat to exploded; wren flies through the gap between planes 2 and 3     |
| 8 Home range    | `top 60%`                                                    | Birdhouse draws in; door circle in red pen                                                                                                  | Flight to the roof; at the end the wren hops down and fades into the door (0.3s)             |
| 9 Join          | `top 80%`                                                    | Closing note in red pen writes on (DrawSVG on a Caveat outline, 1s); wren settles and its eye closes                                        | Wren reappears at the door and flies a short hop to the footer branch                        |

The trail is drawn with DrawSVG along the same path as the flight, scrubbed with it, a few percent
behind the wren.

---

## 5. The wren

### 5.1 Poses

The perched wren (`Bird` in `scenes.tsx`) and one flight pose (`FlyingBird`, wing raised) exist.
New poses, drawn in the same single line, 1.6 stroke in the 220 by 170 scene box, sharing the
body path where possible so a swap does not jump:

| Pose       | Status                                                                               | Use                             |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| Perched    | Exists (`Bird`)                                                                      | At every perch; blinks          |
| Wings up   | Exists as `FlyingBird`; tidy only                                                    | Flapping, half of the cycle     |
| Wings down | New                                                                                  | Flapping, other half            |
| Gliding    | New: wings level, feet tucked                                                        | Descending parts of the route   |
| Landing    | New: wings raised back, feet forward                                                 | The last stretch before a perch |
| Asleep     | New: head turned into the back, eye an arc                                           | Footer, the end of the journal  |
| Carrying   | Composition: wings up plus the plug's cable in the beak (as `ticket` holds a ticket) | Entry 03 only                   |

They are added to `packages/design-system/src/illustrations` as SVG components with stories and a
changeset (phase 3). The wobble filter is not applied to the moving wren: an `feDisplacementMap`
on an element that moves every frame is expensive. The poses get the hand-drawn irregularity in
their path data instead.

### 5.2 One wren, one layer

One SVG wren in one overlay, `pointer-events: none`, `aria-hidden`. One change from the brief: the
overlay is positioned absolutely over the whole document, not fixed to the viewport. The trail has
to stay where it was drawn as the page scrolls, and a document-sized layer holds both the trail
and the wren in the same coordinates with no per-frame offset maths. The wren's progress along the
path is mapped so it is always near the middle of the screen while flying.

### 5.3 The route

- Each section marks its perch with an empty anchor: `<span data-wren-perch="install">`. Entry 06
  has a `data-wren-waypoint` instead (skim, no landing).
- At runtime: read each anchor's document position, build one path through them with
  MotionPathPlugin's raw-coordinate mode (`curviness` about 1.2), with an extra control point
  between perches that lifts the bird above the straight line so it arcs like a hop.
- Recompute on `ResizeObserver` (debounced 150ms), after `document.fonts.ready`, and after the
  pinned sections are measured, then `ScrollTrigger.refresh()`.

Desktop route: hero branch (right of the headline) → price tag (left) → plug (right) → four
branches rising (left to right) → widget launcher (bottom right of the demo) → skim across the
plate → through the gap in the stack → birdhouse roof → footer branch.

### 5.4 The flight

- One timeline, one tween per leg, with a hold between legs so the bird visibly lands. The
  timeline is scrubbed (`scrub: 0.6`) by one ScrollTrigger from the hero to the footer, and each
  leg's start and end are placed at the scroll position where its perch reaches about 40% of the
  screen.
- **Pose from motion:** climbing → flap (swap wings up and down about eight times a second, by
  visibility, not by morphing); descending → glide; the last 10% of a leg → landing; at the perch →
  perched. Scroll velocity (`ScrollTrigger.getVelocity()`) speeds the flap a little.
- **Facing:** mirror horizontally when flying left. Never rotate past ±18 degrees: the angle comes
  from the path in `onUpdate` and is clamped with `gsap.utils.clamp`, and it eases back to 0 at a
  perch.
- **Section animations** wait for the landing: each section's played timeline starts from the
  flight's leg-complete callback, or from its own trigger when the wren is off (small screens,
  reduced motion).

### 5.5 Small screens

- Below 768px: no continuous flight and no trail. The wren appears at each perch as the section
  enters: a short hop-in (12px drop, fade, 0.35s) in the landing pose, then perched.
- Entry 04 is not pinned on a phone; the four tags stack and the wren sits on the top one.
- Below 768px, entry 07 uses the static SVG drawing (no WebGL).

### 5.6 Reduced motion and the footer toggle

- `prefers-reduced-motion: reduce`, or the footer toggle set to off: the wren is drawn perched in
  every section, all marks and drawings complete, no smooth scrolling, no pins, no 3D motion (the
  static SVG fallbacks show). Implemented with `gsap.matchMedia()` so the motion code only runs in
  the "motion allowed" condition and reverts cleanly when it changes.
- The toggle writes `localStorage` (wrapped in try/catch) and sets `data-motion="off"` on `<html>`
  from an inline head script, the same way the theme avoids a flash.

---

## 6. Three.js: the two moments

Three.js earns its place only where a drawing needs real perspective that changes with the scroll.
Both moments are line drawings: fat lines through `Line2` (drei `<Line>`), ink colour, no lights,
no materials, no textures.

1. **Hero background.** A sparse line-drawn landscape in perspective behind the headline: the
   branch the wren sits on running back into depth, a few grass strokes and a low hill line. As the
   visitor scrolls out of the hero the camera drifts slightly down and forward, so the branch moves
   with real parallax against the headline. Why 3D: the parallax of many lines at different depths
   is what makes the hero feel alive, and it is awkward to fake with many SVG layers.
2. **Entry 07, the exploded stack.** Four planes (rounded rectangles with a few interior lines
   standing for each layer's content) in a three-quarter view. Scrolling separates them along one
   axis; leader lines run from each plane's corner to DOM labels, projected every frame so the
   labels are real text. Why 3D: the planes turn slightly as they separate, and lines must stay
   crisp at every angle.

Shared rules:

- **Hand wobble:** a small vertex offset in the line shader from a noise function of position and
  a stepped time value, so lines "boil" at about 8 frames a second like hand-drawn animation, not
  smoothly. Off under reduced motion.
- **Colour from tokens:** read `--ink` and `--paper` with `getComputedStyle` at start and when the
  `dark` class changes (`MutationObserver` on `<html>`).
- **Static first:** each moment renders an SVG drawing of the same scene at its resting angle, in
  the HTML. The canvas fades in over it only once it has drawn its first frame. If WebGL never
  loads, nothing is missing.
- **Fallback for entry 07** is a CSS 3D-transformed stack of the SVG planes, if the WebGL version
  misses the budget (see Q5).

---

## 7. Product claims, checked

### 7.1 Verified as built

Checked in `apps/web`, `packages/*`, `supabase/` and ADRs 0001 to 0021.

- **Live chat**, guest and identified: `/embed` chat page, guest sessions (ADR 0008), typing and
  presence (ADR 0021), attachments (ADR 0012), ratings after a conversation (ADR 0011).
- **Widget snippet**: `packages/widget`, served at `/widget.js`, shadow root, chat in a frame
  (ADR 0009). API built: `init`, `show`, `hide`, `on("unread")`, `identify`, `reset`,
  `setContext`, `destroy`. Snippet tabs for HTML, React and Next.js in Settings → Installation,
  filled in with the install's address. The snippet is two script tags, so the page says "one
  snippet", not "one script tag".
- **Allowed domains** enforced through `frame-ancestors` (ADR 0009).
- **Tickets**: ticket numbers, status, priority, assignee, internal notes, inbox views (ADR 0011).
- **Agent inbox** at `/dashboard/inbox`, with contacts, live visitors (ADR 0020) and saved replies
  (ADR 0021).
- **Knowledge base and public help center** at `/help`: collections, articles, search, sitemap,
  JSON-LD, can be embedded in a host's site in a frame (ADR 0016).
- **Suggested articles** on the chat's home screen (featured articles).
- **Identify, level 1**: unverified `identify({ id, name, email })`.
- **Verified identity, level 1+**: signed HS256 token adapter with key rotation (ADR 0014).
- **Page context for agents**: `setContext` sends the page address, title and custom fields, shown
  in the inbox details panel.
- **Mobile screen, level 2**: `@helpwren/react-native` `SupportScreen` (a web view of `/embed`),
  unread badge endpoint (ADR 0017).
- **Push, level 3**: Expo and Firebase adapters, plus a webhook for a product's own notifications
  (ADRs 0018, 0019).
- **Email notifications**: SMTP and Resend adapters; email on ticket status and replies (ADR 0015).
- **Light, dark and system theme** in the product.
- **Self-hosted on Supabase**, one install per product, **MIT licence** (`LICENSE`).

### 7.2 Softened or dropped

| Claim in the brief                     | What exists                                                                                         | On the page                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Time to first chat: ~10 min"          | A target in the build plan. Never timed; the installer (`@helpwren/cli`) is a stub                  | Dropped from the header. Can return once a fresh install is timed (build plan phase 7) |
| One-command install                    | Not built. Setup is the contributor steps in the README                                             | Primary button goes to a setup guide (Q2)                                              |
| Live "installed and working" check     | Not found in Settings → Installation                                                                | Dropped                                                                                |
| Contextual help ("Help for this page") | `setContext` reaches agents only. The widget does not filter articles by page                       | Replaced by "Suggested articles" (demo) and "page context for agents" (plate)          |
| Headless: build your own UI            | `@helpwren/core` exists but is private and internal; no `@helpwren/react`; no public, versioned API | Shown as a "later" red-pen note in entry 07 only                                       |
| Levels 0 to 3                          | All four levels work, but level 0's "deploy" is manual, and level 3 has no general event webhooks   | Kept, with level 3 as "push and email"; level 0 says "deploy" without "one command"    |
| Reply by email                         | Not built (no inbound mail)                                                                         | Not mentioned. "Email" means notifications                                             |
| Importers                              | Not built                                                                                           | Not mentioned                                                                          |
| Packages on npm                        | Every package is `private`, version 0.0.0                                                           | No `npm install` lines; the React tab installs by script, as in the product            |
| "Runs on free tiers"                   | Plausible (build plan 13) but not measured                                                          | Not claimed                                                                            |
| AI answers                             | Phase 8, not built                                                                                  | Not mentioned                                                                          |

The README still says "no working chat, inbox or help center yet", which is out of date. If the
page links to the README, it should be updated first.

---

## 8. Tools

Versions are the current npm releases on 19 November 2026. The site would live at `apps/site` with
`output: "export"`.

| Tool                 | Version                | Licence                   | Choice and notes                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js, App Router  | 16.4.6 (as `apps/web`) | MIT                       | Static export. Server Components run at build. Not available in export: server actions, rewrites, redirects, headers, proxy, default image optimisation; so images are inline SVG or pre-sized files with `unoptimized`. Robots and sitemap as static route files. [Static exports](https://nextjs.org/docs/app/guides/static-exports) |
| React                | 19.3.x (catalog)       | MIT                       | React Three Fiber 9.8.2 declares `react >=19 <19.4`, so the catalog must stay below 19.4 or R3F must be updated with it                                                                                                                                                                                                                |
| Tailwind CSS         | 4.3.5 (catalog)        | MIT                       | With `@helpwren/design-system` tokens and `theme.css`                                                                                                                                                                                                                                                                                  |
| GSAP                 | 3.15.1                 | GSAP Standard "No Charge" | Core, ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, SplitText, all from the public `gsap` package. [Docs](https://gsap.com/docs/v3/)                                                                                                                                                                                                 |
| `@gsap/react`        | 2.1.2                  | Same as GSAP              | `useGSAP` with `scope` per section; reverts every tween, ScrollTrigger and SplitText on unmount; `contextSafe` for handlers. [React guide](https://gsap.com/resources/React/)                                                                                                                                                          |
| Lenis                | 1.3.27                 | MIT                       | Smooth scrolling, chosen over ScrollSmoother (below). `lenis/react`. [Repo](https://github.com/darkroomengineering/lenis)                                                                                                                                                                                                              |
| three                | 0.187.0                | MIT                       | `Line2`, `LineMaterial`, `LineGeometry` from `three/addons/lines`                                                                                                                                                                                                                                                                      |
| `@react-three/fiber` | 9.8.2                  | MIT                       | `frameloop="demand"`, invalidated by scroll; `dpr={[1, 1.5]}`. [Docs](https://r3f.docs.pmnd.rs/getting-started/introduction)                                                                                                                                                                                                           |
| `@react-three/drei`  | 10.7.9                 | MIT                       | Only `<Line>` (renders `Line2`, `lineWidth` in pixels, accepts `LineMaterial` props). Imported by name so the rest is tree-shaken. If it adds weight, use `Line2` from three directly. [Line](https://drei.docs.pmnd.rs/shapes/line)                                                                                                   |
| Rough.js             | 4.6.6                  | MIT                       | Not used. The existing SVG wobble filter and hand-drawn paths already give the line; runtime generation costs bytes and frames                                                                                                                                                                                                         |
| Rive, Lottie         | none                   | none                      | Not used. Every pose works in SVG                                                                                                                                                                                                                                                                                                      |

### 8.1 GSAP licence, current terms

GSAP is owned by Webflow and released under the Standard "No Charge" licence (effective 30 April
2025, last changed 30 May 2025, [terms](https://gsap.com/standard-license)). It allows use in
websites and apps, including commercial ones, at no charge, and covers all plugins, including
SplitText, DrawSVG and MorphSVG. It forbids using GSAP in a no-code visual animation builder that
competes with Webflow's, and removing its notices. It is not an open-source licence, and Webflow
may change it (versions released before a change stay usable under the old terms).

Consequence: GSAP stays inside `apps/site`, never in a published Helpwren package (the widget, the
React Native screen, the design system), so the MIT packages carry no non-open-source dependency.
This goes into an ADR (`docs/decisions/0025-landing-page.md`) in phase 1.

### 8.2 Lenis or ScrollSmoother

**Lenis.** Both keep the browser's native scroll. ScrollSmoother moves a `#smooth-content` wrapper
with a transform, so `position: fixed` inside it stops being fixed and `position: sticky` does not
work there, and it says nothing about reduced motion
([docs](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)). Lenis keeps sticky and anchor links
working, has `respectReducedMotion` on by default (smoothing off, jumps instant), leaves touch
scrolling native by default (`syncTouch: false`), and is a few kilobytes. It is driven from GSAP's
ticker so there is one animation loop:

```js
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Lenis does not work over iframes, which matters for nothing here because the demo widget is built
from components, not framed. If the owner prefers no smoothing at all, removing Lenis changes
nothing else.

### 8.3 GreenSock's material for AI assistants

GreenSock publishes both:

- **Official agent skills**, MIT: [`greensock/gsap-skills`](https://github.com/greensock/gsap-skills),
  eight skills (core, timeline, ScrollTrigger, plugins, utils, React, performance, frameworks),
  installable in Claude Code with `/plugin marketplace add greensock/gsap-skills`.
- **Docs for language models**: [`gsap.com/llms.txt`](https://gsap.com/llms.txt) indexes Markdown
  versions of every docs page (for example `https://gsap.com/docs/v3/Plugins/SplitText.md`).

Plan: install the skills for phases 2 to 4 (with the owner's approval, since it changes the
Claude Code setup) and read the Markdown docs when writing each plugin's code. The Next.js docs
also publish an index for models at `nextjs.org/docs/llms.txt`.

---

## 9. Performance plan

Targets from the brief: Lighthouse mobile Performance 90+, Accessibility, Best Practices and SEO
100; LCP under 2.5s, CLS under 0.1, INP under 200ms; 60fps on a mid-range phone.

**The page works without JavaScript.**

- Every section is static HTML from the build, with drawings complete and the wren perched in each
  section. Initial hidden states (an undrawn line, a headline before its reveal) are set only under
  `html[data-motion="on"]`, which the motion layer adds when it starts. With no JavaScript, or
  before it loads, everything is visible. Nothing jumps when motion starts, because hidden states
  are transforms and opacity, never layout.
- The LCP element is the hero headline: text, in a preloaded Figtree. JetBrains Mono and Caveat
  load without preload, through `next/font` (self-hosted at build, `display: swap`, sizes adjusted
  to avoid shift).

**JavaScript in three tiers.**

1. **On load:** React, the page's small client islands (theme control, motion toggle, demo widget
   shell). Budget: under 120 KB compressed. Measured in phase 1 with the build output.
2. **After the page is interactive** (`requestIdleCallback`, timeout 2s): the motion layer, GSAP
   with its plugins and Lenis, through `import()`. Budget: under 70 KB compressed. Not loaded at all
   under reduced motion or with the toggle off.
3. **Near the viewport, on capable devices only:** each Three.js scene, as its own chunk, loaded
   when its section is within one screen (`IntersectionObserver`, `rootMargin: 100%`). "Capable"
   means WebGL2 available, not `saveData`, `deviceMemory` of 4 or more where the browser reports
   it, at least 4 cores, and width 768px or more. Otherwise the SVG stays.

**Frames.**

- Animate only `transform`, `opacity` and SVG stroke offsets. No filters on moving elements (the
  wobble filter only on still sketches).
- One loop: GSAP's ticker drives Lenis; R3F renders on demand when the scroll changes and only
  while its canvas is on screen (`frameloop` set to `"never"` when it leaves).
- Two pins only (entries 04 and 07). The wren path is computed once per resize, not per frame.
- Pixel ratio capped at 1.5 for the canvas; antialiasing off (fat lines are already smooth).

**Clean-up.** Every section's animations live in its own `useGSAP` with `scope`, so they revert
on unmount. The canvases dispose of geometry and materials and call `forceContextLoss` on unmount.

**Testing.** Lighthouse CI on the static export, mobile preset, on every pull request to the site.
Manual runs with 4x CPU throttling in Chrome, and on one mid-range Android phone and one iPhone
before release. axe for accessibility.

**Accessibility notes.** Semantic landmarks and one `h1`; each entry is a `section` with an `h2`.
The wren overlay and decorative sketches are `aria-hidden`; meaningful sketches (the anatomy
study) are labelled. SplitText adds `aria-label` to split headlines itself. The demo widget is
keyboard operable. No information is carried by motion only: every mark (a struck-out price tag, a
circled word) is also in the text.

---

## 10. How it is organised (for phase 1)

```
apps/site/
  src/app/                  layout, page, robots, sitemap, opengraph images
  src/sections/<name>/      one folder per entry: the section, its copy, its use-<name>-motion hook
  src/motion/               shared helpers: drawIn, highlighterSwipe, penCircle, the Lenis setup,
                            the reduced-motion and toggle condition
  src/wren/                 the overlay, the route builder, the flight timeline
  src/scenes/               the two Three.js scenes and their SVG fallbacks
```

Theme: the site needs the product's light, dark and system control. Today it lives in
`apps/web/src/lib/theme.ts`, `theme-script.ts` and `features/theme`. Either move these into the
design system (a package change with a changeset) or copy them into the site (Q6).

---

## 11. Open questions for the owner

1. **Say that it is early?** The product is pre-alpha and nothing is released. I suggest a small
   tag in the hero, `EARLY · NOT YET RELEASED`, and wording that does not suggest people can install
   it in minutes today. Yes or no?
2. **Where does the primary button go?** There is no installer and no install guide yet. Options:
   write `docs/install.md` before launch and link it, or make GitHub the primary button for now.
3. **Is the GitHub repository public at launch?** If not, the "View on GitHub" and "Join the
   survey" links have nowhere to go. Star counts are left out either way.
4. **Hosting** for the static export (Vercel, Cloudflare Pages, GitHub Pages)? It decides how
   security headers and trailing slashes are set, since a static export cannot set headers itself.
5. **Entry 07 in WebGL or CSS 3D?** The plan keeps both Three.js moments, as the brief asks. If the
   anatomy scene breaks the budget, may it fall back to a CSS 3D stack of SVG planes for everyone?
6. **Theme code:** move the theme helpers into the design system (shared, needs a changeset), or
   copy them into the site?
7. **New wren poses** (wings down, glide, landing, asleep) go into the design system in phase 3,
   with a changeset. Agreed, or keep them site-only?
8. **Installing GreenSock's agent skills** in this project's Claude Code setup for phases 2 to 4?
9. **Docs and live demo**: the build plan has docs and a live demo install at
   `helpwren.fewerlabs.dev`. Are they out of scope for this page, with links added later?
10. **Correcting stale docs**: may I update the README's status and the old hex values in
    `docs/design-system.md` as separate small commits before the page links to them?
