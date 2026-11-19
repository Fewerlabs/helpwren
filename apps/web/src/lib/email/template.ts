import { type Brand } from "@helpwren/core";

import { readableOn } from "@/lib/accent";

/** What one email says. Everything here is plain text; the template does the escaping. */
export interface EmailContent {
  /** A line shown in the inbox beside the subject, before the email is opened. */
  preview: string;
  heading: string;
  /** Paragraphs under the heading. */
  body: readonly string[];
  /** Something said, shown set apart: an agent's reply, for example. */
  quotes?: readonly { from: string; text: string }[] | undefined;
  /** The one thing to do next. */
  action?: { label: string; url: string } | undefined;
  /** Why they are getting this, in small print at the foot. */
  footer: string;
}

const DEFAULT_ACCENT = "#3d6b57";

/** Makes text safe to put inside HTML, including inside an attribute. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escaped, with line breaks kept as the writer typed them. */
const lines = (text: string) => escapeHtml(text).replaceAll("\n", "<br>");

/**
 * One email in the install's brand, as HTML and as plain text. The layout is tables and inline
 * styles because that is what mail clients agree on; it carries no scripts, no remote fonts and
 * no images but the brand's logo.
 */
export function renderEmail(brand: Brand, content: EmailContent): { html: string; text: string } {
  const accent = brand.button ?? brand.accent ?? DEFAULT_ACCENT;
  const mark = brand.logo
    ? `<img src="${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.name)}" height="32" style="display:block;height:32px;width:auto;border:0">`
    : `<span style="font-size:16px;font-weight:600;color:#101a15">${escapeHtml(brand.name)}</span>`;

  const quotes = (content.quotes ?? [])
    .map(
      (quote) =>
        `<tr><td style="padding:0 0 12px"><div style="border-left:3px solid ${accent};padding:2px 0 2px 14px"><div style="font-size:12px;color:#5f6c65;padding-bottom:4px">${escapeHtml(quote.from)}</div><div style="font-size:15px;line-height:1.55;color:#101a15">${lines(quote.text)}</div></div></td></tr>`,
    )
    .join("");
  const action = content.action
    ? `<tr><td style="padding:8px 0 4px"><a href="${escapeHtml(content.action.url)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:${accent};color:${readableOn(accent)};font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(content.action.label)}</a></td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(content.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ec"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 4px 16px">${mark}</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e3ebe7;border-radius:14px;padding:28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:19px;font-weight:600;line-height:1.3;color:#101a15;padding:0 0 12px">${escapeHtml(content.heading)}</td></tr>
${content.body.map((paragraph) => `<tr><td style="font-size:15px;line-height:1.55;color:#4a463e;padding:0 0 14px">${lines(paragraph)}</td></tr>`).join("")}
${quotes}${action}
</table>
</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#8c8779;padding:16px 4px 0">${escapeHtml(content.footer)}</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.body,
    ...(content.quotes ?? []).flatMap((quote) => ["", `${quote.from}:`, quote.text]),
    ...(content.action ? ["", `${content.action.label}: ${content.action.url}`] : []),
    "",
    "--",
    content.footer,
  ].join("\n");

  return { html, text };
}
