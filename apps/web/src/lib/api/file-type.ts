import { ATTACHMENT_TYPES } from "@helpwren/core";

type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string) => [...Buffer.from(text, "latin1")];

/** Whether the bytes hold this text anywhere, as a ZIP holds the names of the files in it. */
function contains(bytes: Uint8Array, text: string): boolean {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(text, 0, "latin1");
}

/** Markup a browser would draw as a page or a picture with scripts, if it were ever asked to. */
const MARKUP = /<\s*(!doctype|html|head|body|script|svg|iframe|object|embed|\?xml)\b/i;

/** Plain text: valid UTF-8, with no NUL bytes and no markup in it. */
function isText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  return !MARKUP.test(text);
}

/**
 * What a file really is, from its bytes, when it was sent as one of the types the chat accepts
 * and is one of them. `null` for anything else: a page of HTML named `photo.png`, a program named `report.pdf`, a picture
 * drawn in SVG. A file whose name only got the kind wrong, such as a PNG named `.jpg`, is kept
 * as what it is.
 *
 * Some bytes fit more than one type: old Word and Excel files share one container, and text is
 * text whether it is called plain or CSV. Then the type it was sent as decides, if it fits. New
 * Word and Excel files are ZIPs, so the ZIP is checked to hold a document or a workbook.
 */
export function detectAttachmentType(bytes: Uint8Array, claimed: string): AttachmentType | null {
  // A file sent as something not on the list is refused whatever its bytes say: a program's
  // first bytes can happen to read as text.
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(claimed)) return null;
  const detected = ((): AttachmentType | readonly AttachmentType[] | null => {
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"))) {
      return "image/gif";
    }
    if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
      return "image/webp";
    }
    if (startsWith(bytes, ascii("%PDF-"))) return "application/pdf";
    if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
      return ["application/msword", "application/vnd.ms-excel"];
    }
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
      if (contains(bytes, "word/")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }
      if (contains(bytes, "xl/")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }
      return null;
    }
    if (isText(bytes)) return ["text/plain", "text/csv"];
    return null;
  })();

  if (detected === null) return null;
  const candidates: readonly AttachmentType[] =
    typeof detected === "string" ? [detected] : detected;
  return candidates.find((type) => type === claimed) ?? candidates[0] ?? null;
}
