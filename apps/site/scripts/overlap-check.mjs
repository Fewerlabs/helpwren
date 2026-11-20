#!/usr/bin/env node
/*
 * The flying wren never crosses the words. Loads the built site (pnpm build && pnpm start, or
 * SITE_URL), scrolls it top to bottom in 20px steps at each width, and at every step compares the
 * wren's box with every heading, paragraph, caption, list item and code block on screen. Also
 * fails if the wren is cut off by the screen's edge. Exits 1 on any overlap.
 *
 *   node scripts/overlap-check.mjs [--widths=1280,1440] [--height=800] [--step=20] [--scheme=dark]
 *     [--path=/lab/wren --text="[data-lab-text]"]   (another page, and what counts as words)
 */
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const SITE = (process.env.SITE_URL ?? "http://localhost:3210") + (args.path ?? "");
const WIDTHS = (args.widths ?? "1280,1440").split(",").map(Number);
const HEIGHT = Number(args.height ?? 800);
const STEP = Number(args.step ?? 20);
const SCHEME = args.scheme ?? "light";
// Must match TEXT_SELECTOR in src/wren/flight.tsx.
const TEXT = args.text ?? "h1, h2, h3, h4, h5, h6, p, figcaption, li, blockquote, pre, dt, dd";

const browser = await chromium.launch();
let failures = 0;
for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    colorScheme: SCHEME,
    reducedMotion: "no-preference",
  });
  // Before the page's scripts run; the document element may not exist yet.
  await context.addInitScript(() => {
    const mark = () => document.documentElement?.setAttribute("data-wren-check", "");
    mark();
    document.addEventListener("readystatechange", mark);
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-wren-flyer] svg path"), null, {
    timeout: 15_000,
  });
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let samples = 0;
  const hits = new Map();
  for (let y = 0; ; y += STEP) {
    const at = Math.min(y, total);
    await page.evaluate((top) => {
      window.scrollTo({ top, behavior: "instant" });
    }, at);
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }),
    );
    const found = await page.evaluate((selector) => {
      const flyer = document.querySelector("[data-wren-flyer]");
      if (!flyer || getComputedStyle(flyer).opacity === "0") return { mode: "inside", hits: [] };
      const wren = flyer.querySelector("svg").getBoundingClientRect();
      const out = [];
      const air = flyer.getAttribute("data-mode") === "air";
      if (
        air &&
        (wren.top < 0 || wren.bottom > innerHeight || wren.left < 0 || wren.right > innerWidth)
      )
        out.push("cut off by the screen's edge in flight");
      for (const element of document.querySelectorAll(selector)) {
        if (element.closest("[data-wren-layer]") || element.querySelector(selector)) continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        if (box.bottom < 0 || box.top > innerHeight) continue;
        const overlap =
          Math.min(box.right, wren.right) - Math.max(box.left, wren.left) > 0 &&
          Math.min(box.bottom, wren.bottom) - Math.max(box.top, wren.top) > 0;
        if (overlap) {
          const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
          const at = (r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join(",");
          out.push(
            `over <${element.tagName.toLowerCase()}> "${text}" (wren ${at(wren)}, words ${at(box)})`,
          );
        }
      }
      return { mode: flyer.getAttribute("data-mode"), hits: out };
    }, TEXT);
    samples += 1;
    for (const hit of found.hits) {
      const seen = hits.get(hit) ?? { first: at, last: at, mode: found.mode, count: 0 };
      seen.last = at;
      seen.count += 1;
      hits.set(hit, seen);
    }
    if (at === total) break;
  }
  console.log(
    `${String(width)}x${String(HEIGHT)} ${SCHEME}: ${String(samples)} samples, one every ` +
      `${String(STEP)}px of a ${String(total)}px scroll`,
  );
  if (hits.size === 0) console.log("  pass: no overlaps, and the wren stayed on screen");
  for (const [hit, seen] of hits) {
    failures += 1;
    console.log(
      `  FAIL scroll ${String(seen.first)}-${String(seen.last)} ` +
        `(${String(seen.count)} samples, ${String(seen.mode)}): ${hit}`,
    );
  }
  await context.close();
}
await browser.close();
process.exit(failures > 0 ? 1 : 0);
