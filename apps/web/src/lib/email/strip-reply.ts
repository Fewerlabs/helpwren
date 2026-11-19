import EmailReplyParser from "email-reply-parser";

/**
 * The new words in an email reply, without the earlier messages it quotes or the sender's
 * signature. The text part is preferred; HTML is turned into text only when there is none.
 *
 * Crisp's `email-reply-parser` (MIT, no dependencies, linear-time patterns) handles "On … wrote:"
 * in about ten languages, `>` quoting and common signatures. Outlook's "From: … Sent: …" block
 * and its underscore rule are cut here first, because Outlook quotes without any `>`.
 */
export function replyText(email: { text: string | null; html: string | null }): string {
  const source = email.text?.trim() ? email.text : email.html ? htmlToText(email.html) : "";
  const cut = cutOutlookQuote(source.replace(/\r\n?/g, "\n"));
  return new EmailReplyParser()
    .parseReply(cut)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const OUTLOOK_FROM = /^\s*\**(from|de|von|van|da|från|fra)\**\s*:/i;
const OUTLOOK_SENT =
  /^\s*\**(sent|date|envoyé|gesendet|verzonden|inviato|enviado|skickat|sendt)\**\s*:/i;
const OUTLOOK_RULE = /^\s*_{10,}\s*$/;
const ORIGINAL_MESSAGE =
  /^\s*-{2,}\s*(original message|message d'origine|ursprüngliche nachricht)/i;

/** Everything from Outlook's quoted header onwards is the earlier message. */
function cutOutlookQuote(text: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex(
    (line, index) =>
      OUTLOOK_RULE.test(line) ||
      ORIGINAL_MESSAGE.test(line) ||
      (OUTLOOK_FROM.test(line) &&
        lines.slice(index + 1, index + 5).some((next) => OUTLOOK_SENT.test(next))),
  );
  return start === -1 ? text : lines.slice(0, start).join("\n");
}

const BLOCK = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "tr",
  "ul",
]);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const point =
        code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isInteger(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    }
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/**
 * HTML to plain text, for an email with no text part. Nothing is rendered or run: tags are read
 * as tokens and dropped, the contents of scripts and styles go entirely, and what is inside a
 * `<blockquote>` comes out `>`-quoted so the reply parser can recognise it as quoted.
 */
export function htmlToText(html: string): string {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");

  const lines: { depth: number; text: string }[] = [];
  let depth = 0;
  let current = { depth: 0, text: "" };
  const breakLine = () => {
    lines.push(current);
    current = { depth, text: "" };
  };

  for (const [token, closing, tag] of cleaned.matchAll(
    /<(\/?)([a-z][a-z0-9]*)\b[^>]*>|[^<]+|</gi,
  )) {
    if (tag === undefined) {
      const text = decodeEntities(token.replace(/\s+/g, " "));
      if (current.text === "") current.depth = depth;
      current.text += text;
      continue;
    }
    const name = tag.toLowerCase();
    if (!BLOCK.has(name)) continue;
    // A block ends a line that has words. A `<br>` on its own is a blank line someone typed,
    // and a paragraph leaves one after it.
    if (current.text.trim() !== "" || name === "br") breakLine();
    if (name === "p" && closing) lines.push({ depth, text: "" });
    if (name === "blockquote") depth = Math.max(0, depth + (closing ? -1 : 1));
    current.depth = depth;
  }
  breakLine();

  return lines
    .map((line) => `${"> ".repeat(line.depth)}${line.text.trim()}`.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
