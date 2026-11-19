import { Fragment, type ComponentProps, type ReactNode } from "react";

import { cn } from "#lib/cn";

import { CodeSnippet } from "../code-snippet/code-snippet";
import { youtubeEmbedUrl, youtubeId } from "./video";

/** A mark on a run of text, such as bold or a link. */
export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown> | undefined;
}

/**
 * One node of a rich-text document: a block such as a paragraph or a heading, or a run of
 * text. This is the tree `RichTextEditor` produces and `RichText` draws.
 */
export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown> | undefined;
  marks?: readonly RichTextMark[] | undefined;
  text?: string | undefined;
  content?: readonly RichTextNode[] | undefined;
}

/** A heading inside a document, for a table of contents. */
export interface RichTextHeading {
  /** The `id` of the heading on the page, to link to as `#id`. */
  id: string;
  text: string;
  level: 2 | 3 | 4;
}

const text = (node: RichTextNode): string =>
  node.text ?? node.content?.map((child) => text(child)).join("") ?? "";

const headingLevel = (node: RichTextNode): 2 | 3 | 4 => {
  const level = node.attrs?.level;
  return level === 3 || level === 4 ? level : 2;
};

/** Gives each heading an id made from its words, numbering any that repeat. */
function collectHeadings(doc: RichTextNode) {
  const ids = new Map<RichTextNode, string>();
  const headings: RichTextHeading[] = [];
  const used = new Map<string, number>();

  const visit = (node: RichTextNode) => {
    if (node.type === "heading") {
      const words = text(node).trim();
      const base =
        words
          .toLowerCase()
          .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
          .replace(/^-+|-+$/g, "") || "section";
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;
      ids.set(node, id);
      if (words) headings.push({ id, text: words, level: headingLevel(node) });
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  return { ids, headings };
}

/** The headings of a document in order, with the ids `RichText` gives them. */
export function richTextHeadings(doc: RichTextNode): RichTextHeading[] {
  return collectHeadings(doc).headings;
}

/**
 * A link's address, if it is one a reader can safely follow: a web or email address, a phone
 * number, or a path on this site. Anything else, such as `javascript:`, gives `undefined`.
 */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  // A path or an anchor on this site. `//host` would leave it, so that is not one.
  if (/^(\/(?!\/)|#)/.test(href)) return href;
  return undefined;
}

/** A picture's address, if it is on the web or on this site. */
function safeSrc(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const src = value.trim();
  return /^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src) ? src : undefined;
}

const tones = ["info", "tip", "warning"] as const;
const toneLabels = { info: "Note", tip: "Tip", warning: "Warning" } as const;

function applyMarks(node: RichTextNode): ReactNode {
  let result: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") result = <strong>{result}</strong>;
    else if (mark.type === "italic") result = <em>{result}</em>;
    else if (mark.type === "underline") result = <u>{result}</u>;
    else if (mark.type === "strike") result = <s>{result}</s>;
    else if (mark.type === "code") result = <code>{result}</code>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        const leaves = /^https?:/i.test(href);
        result = (
          <a href={href} {...(leaves ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {result}
          </a>
        );
      }
    }
  }
  return result;
}

export interface RichTextProps extends Omit<ComponentProps<"div">, "children"> {
  /** The document to draw: a `doc` node, as `RichTextEditor` produces. */
  doc: RichTextNode;
}

/**
 * Draws a rich-text document as a page: headings, paragraphs, lists, quotes, code, pictures and
 * callouts. It runs on the server and needs none of the editor's code.
 *
 * It draws only the kinds of node and mark it knows, and follows only safe links, so a
 * document is safe to show whoever wrote it: nothing in it can become markup or a script.
 */
export function RichText({ doc, className, ...props }: RichTextProps) {
  const { ids } = collectHeadings(doc);

  const children = (node: RichTextNode) =>
    node.content?.map((child, index) => <Fragment key={index}>{render(child)}</Fragment>);

  function render(node: RichTextNode): ReactNode {
    switch (node.type) {
      case "text":
        return applyMarks(node);
      case "paragraph":
        return <p>{children(node)}</p>;
      case "heading": {
        const Tag = `h${headingLevel(node)}` as const;
        return <Tag id={ids.get(node)}>{children(node)}</Tag>;
      }
      case "bulletList":
        return <ul>{children(node)}</ul>;
      case "orderedList": {
        const start = node.attrs?.start;
        return (
          <ol {...(typeof start === "number" && start !== 1 ? { start } : {})}>{children(node)}</ol>
        );
      }
      case "listItem":
        return <li>{children(node)}</li>;
      case "blockquote":
        return <blockquote>{children(node)}</blockquote>;
      case "codeBlock": {
        // With a copy button and its language named, as documentation shows code.
        const language = node.attrs?.language;
        return (
          <CodeSnippet
            code={text(node).replace(/\n$/, "")}
            {...(typeof language === "string" && language ? { language } : {})}
          />
        );
      }
      case "horizontalRule":
        return <hr />;
      case "hardBreak":
        return <br />;
      case "image": {
        const src = safeSrc(node.attrs?.src);
        if (!src) return null;
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const caption = typeof node.attrs?.title === "string" ? node.attrs.title : "";
        return (
          <figure>
            <img src={src} alt={alt} loading="lazy" decoding="async" />
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        );
      }
      case "video": {
        const id = youtubeId(node.attrs?.id);
        if (!id) return null;
        return (
          <div className="hw-video">
            <iframe
              src={youtubeEmbedUrl(id)}
              title="YouTube video"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        );
      }
      case "callout": {
        const tone = tones.find((name) => name === node.attrs?.tone) ?? "info";
        return (
          // The word a sighted reader sees comes from the stylesheet; this says it aloud.
          <div role="note" aria-label={toneLabels[tone]} className="hw-callout" data-tone={tone}>
            {children(node)}
          </div>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div data-slot="rich-text" className={cn("hw-rich-text", className)} {...props}>
      {children(doc)}
    </div>
  );
}
