// Captures the real product for the website: the widget on a page, a conversation in it, the
// team's inbox and the public help center, in light and dark, at 2x, saved as AVIF and WebP in
// public/captures. Nothing here is drawn by hand: every image is the running app.
//
// Run it against a local install with the demo data, never a real one:
//   1. Start a Supabase stack with the demo data (`pnpm db:start` at the root, or a separate stack).
//   2. Build and start apps/web against it, on any port.
//   3. HELPWREN_APP_URL=http://localhost:3000 MAILPIT_URL=http://127.0.0.1:54324 \
//        pnpm --filter @helpwren/site capture
//
// The script signs in as the demo admin from supabase/seed.sql and sends one demo message as a
// guest, so it changes the demo database.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";

const APP = (process.env.HELPWREN_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MAILBOX = (process.env.MAILPIT_URL ?? "http://127.0.0.1:54324").replace(/\/$/, "");
const AGENT = process.env.CAPTURE_AGENT_EMAIL ?? "ada@example.com";
const OUT = fileURLToPath(new URL("../public/captures/", import.meta.url));
/** Device pixels per CSS pixel. */
const SCALE = 2;
/** The widths images are saved at, in CSS pixels: what the page shows them at, at most. */
const WIDTHS = { widget: 400, conversation: 400, inbox: 1200, help: 1200 };
const QUALITY = { avif: 55, webp: 78 };

/** A plain host page with the widget on it, as a site would add it. */
function hostPage(scheme) {
  const background = scheme === "dark" ? "#0c0c0d" : "#f7f7f7";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pricing · Acme</title>
<style>html,body{margin:0;height:100%;background:${background}}</style></head>
<body><script src="${APP}/widget.js"></script>
<script>Helpwren.init({ source: "web", welcome: false });</script></body></html>`;
}

async function save(name, scheme, png) {
  const width = WIDTHS[name] * SCALE;
  const base = sharp(png).resize({ width, withoutEnlargement: true });
  await base.clone().avif({ quality: QUALITY.avif }).toFile(`${OUT}${name}-${scheme}.avif`);
  await base.clone().webp({ quality: QUALITY.webp }).toFile(`${OUT}${name}-${scheme}.webp`);
  const { width: w, height: h } = await sharp(png).metadata();
  console.log(`${name}-${scheme}: ${String(w / SCALE)}x${String(h / SCALE)}`);
}

async function signInCode(email) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(
      `${MAILBOX}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`,
    );
    const { messages } = await response.json();
    const code = /\b\d{6}\b/.exec(messages[0]?.Snippet ?? "")?.[0];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in code arrived for ${email}`);
}

/** Box around the widget's panel and launcher, with a margin. */
async function widgetBox(page) {
  const frame = await page.locator('iframe[title="Chat"]').boundingBox();
  const launcher = await page.getByRole("button", { name: /close chat|open chat/i }).boundingBox();
  if (!frame || !launcher) throw new Error("The widget did not open");
  const margin = 16;
  const x = Math.min(frame.x, launcher.x) - margin;
  const y = frame.y - margin;
  const right = Math.max(frame.x + frame.width, launcher.x + launcher.width) + margin;
  const bottom = Math.max(frame.y + frame.height, launcher.y + launcher.height) + margin;
  return { x, y, width: right - x, height: bottom - y };
}

async function captureWidget(browser, scheme) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: SCALE,
    colorScheme: scheme,
  });
  await page.setContent(hostPage(scheme), { waitUntil: "load" });
  await page.getByRole("button", { name: /open chat/i }).click();
  const chat = page.frameLocator('iframe[title="Chat"]');
  await chat.getByRole("heading", { name: /how can we help/i }).waitFor();
  await page.waitForTimeout(1200);
  await save("widget", scheme, await page.screenshot({ clip: await widgetBox(page) }));

  // A conversation, sent as a guest of the demo install.
  await chat.getByRole("button", { name: "Send us a message" }).click();
  const name = chat.getByLabel("Your name");
  if (await name.isVisible().catch(() => false)) {
    await name.fill("Maya Okafor");
    await chat.getByRole("textbox", { name: "Email" }).fill("maya.capture@example.org");
  }
  await chat.getByLabel("Your message").fill("Can I change the email my invoices go to?");
  await chat.getByRole("button", { name: "Send message" }).click();
  await chat.getByRole("log", { name: "Messages" }).getByText("invoices go to").waitFor();
  await page.waitForTimeout(1200);
  await save("conversation", scheme, await page.screenshot({ clip: await widgetBox(page) }));
  await page.close();
}

async function captureApp(browser, scheme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: SCALE,
    colorScheme: scheme,
  });
  const page = await context.newPage();

  await page.goto(`${APP}/help`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await save("help", scheme, await page.screenshot());

  await fetch(`${MAILBOX}/api/v1/messages`, { method: "DELETE" });
  await page.goto(`${APP}/login`);
  await page.getByLabel("Work email").fill(AGENT);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByLabel("Sign-in code").fill(await signInCode(AGENT));
  await page.waitForURL(/\/dashboard\/inbox/);
  // Open the newest conversation, so the inbox shows a thread beside the list.
  await page
    .getByRole("region", { name: "Conversations" })
    .getByRole("button", { name: /Maya Okafor/ })
    .first()
    .click();
  await page.waitForURL(/\?c=/);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await save("inbox", scheme, await page.screenshot());
  await context.close();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const scheme of ["light", "dark"]) {
    await captureWidget(browser, scheme);
    await captureApp(browser, scheme);
  }
} finally {
  await browser.close();
}
