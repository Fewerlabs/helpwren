import { z } from "zod";

/**
 * The kinds of block and inline node an article's body may hold. The body is stored as a tree
 * of these (the format the editor works in), never as HTML, and a screen draws only the kinds
 * it knows. So a body cannot carry a script, whatever was written to the database.
 */
export const RICH_TEXT_NODES = [
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "callout",
  "hardBreak",
  "text",
] as const;

export const RICH_TEXT_MARKS = ["bold", "italic", "underline", "strike", "code", "link"] as const;

/** What a callout is for, which decides its colour and icon. */
export const calloutToneSchema = z.enum(["info", "tip", "warning"]);
export type CalloutTone = z.infer<typeof calloutToneSchema>;

const attrsSchema = z.record(
  z.string().max(40),
  z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
);

const markSchema = z.object({
  type: z.enum(RICH_TEXT_MARKS),
  attrs: attrsSchema.optional(),
});

const nodeSchema = z.object({
  type: z.enum(RICH_TEXT_NODES),
  attrs: attrsSchema.optional(),
  marks: z.array(markSchema).max(RICH_TEXT_MARKS.length).optional(),
  text: z.string().optional(),
  get content() {
    return z.array(nodeSchema).optional();
  },
});

export type RichTextNode = z.infer<typeof nodeSchema>;

/** An article's body: a `doc` node holding its blocks. */
export const richTextSchema = nodeSchema.refine((node) => node.type === "doc");
export type RichText = RichTextNode;

/** A body with nothing in it. */
export const EMPTY_RICH_TEXT: RichText = { type: "doc", content: [] };

/** Every word of a body as one line of plain text, for a description or a preview. */
export function richTextToPlainText(node: RichTextNode): string {
  const parts: string[] = [];
  const visit = (current: RichTextNode) => {
    if (current.text) parts.push(current.text);
    current.content?.forEach(visit);
    // Words run on inside a block, and a block ends where the next begins.
    if (current.type !== "text") parts.push(" ");
  };
  visit(node);
  return parts.join("").replace(/\s+/g, " ").trim();
}
