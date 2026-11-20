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
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";

const APP = (process.env.HELPWREN_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MAILBOX = (process.env.MAILPIT_URL ?? "http://127.0.0.1:54324").replace(/\/$/, "");
const AGENT = process.env.CAPTURE_AGENT_EMAIL ?? "ada@example.com";
/** The local site the widget is shown on, served by this script while it runs. */
const HOST_PORT = 4199;
const HOST = `http://127.0.0.1:${String(HOST_PORT)}`;
const OUT = fileURLToPath(new URL("../public/captures/", import.meta.url));
/** Device pixels per CSS pixel. */
const SCALE = 2;
/** The widths images are saved at, in CSS pixels: what the page shows them at, at most. */
const WIDTHS = { widget: 400, conversation: 400, inbox: 1200, help: 1200 };
const QUALITY = { avif: 55, webp: 78 };
/** Milliseconds between keys when typing into the chat. */
const TYPING_MS = 45;

/**
 * A host page with the widget on it, as a site would add it. Its background is transparent, so
 * the capture is the widget alone, which sits on the website's paper in either theme. The widget
 * has one look of its own (the install's branding), so it is captured once.
 */
function hostPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pricing · Acme</title>
<style>html,body{margin:0;height:100%;background:transparent}</style></head>
<body><script src="${APP}/widget.js"></script>
<script>Helpwren.init({ source: "web", welcome: false });</script></body></html>`;
}

async function save(name, scheme, png) {
  // The widget looks the same in both themes: save it under both names.
  if (scheme === "both") {
    await save(name, "light", png);
    await save(name, "dark", png);
    return;
  }
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

async function captureWidget(browser) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: SCALE,
  });
  // Served from an address of its own, as a real site is: the chat records the page it was on.
  await page.goto(`${HOST}/pricing`, { waitUntil: "load" });
  await page.getByRole("button", { name: /open chat/i }).click();
  const chat = page.frameLocator('iframe[title="Chat"]');
  await chat.getByRole("heading", { name: /how can we help/i }).waitFor();
  await page.waitForTimeout(1200);
  await save(
    "widget",
    "both",
    await page.screenshot({ clip: await widgetBox(page), omitBackground: true }),
  );

  // A conversation, sent as a guest of the demo install.
  await chat.getByRole("button", { name: "Send us a message" }).click();
  const name = chat.getByLabel("Your name");
  if (await name.isVisible().catch(() => false)) {
    // Typed as a person types: the install's bot check turns away a form filled in an instant.
    await name.pressSequentially("Maya Okafor", { delay: TYPING_MS });
    await chat
      .getByRole("textbox", { name: "Email" })
      .pressSequentially("maya.capture@example.org", { delay: TYPING_MS });
  }
  await chat
    .getByLabel("Your message")
    .pressSequentially("Can I change the email my invoices go to?", { delay: TYPING_MS });
  await chat.getByRole("button", { name: "Send message" }).click();
  await chat.getByRole("log", { name: "Messages" }).getByText("invoices go to").waitFor();
  await page.waitForTimeout(1200);
  await save(
    "conversation",
    "both",
    await page.screenshot({ clip: await widgetBox(page), omitBackground: true }),
  );
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
    .getByRole("button", { name: /Jonas Berg/ })
    .first()
    .click();
  await page.waitForURL(/\?c=/);
  // The details panel shows an empty "Not found." block for a contact who is not on the site
  // now; hide the panel so the capture is the inbox and the thread.
  const details = page.getByRole("button", { name: "Details", exact: true });
  if ((await details.getAttribute("aria-pressed")) !== "false") await details.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await save("inbox", scheme, await page.screenshot());
  await context.close();
}

await mkdir(OUT, { recursive: true });
const host = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(hostPage());
});
await new Promise((resolve) => host.listen(HOST_PORT, "127.0.0.1", () => resolve(undefined)));
const browser = await chromium.launch();
try {
  await captureWidget(browser);
  for (const scheme of ["light", "dark"]) await captureApp(browser, scheme);
} finally {
  await browser.close();
  host.close();
}
