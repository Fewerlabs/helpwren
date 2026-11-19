import { type Editor } from "@tiptap/core";

import { type IconName } from "../../base/icon/registry";

/** One thing the block menu can add or turn the current block into. */
export interface BlockChoice {
  id: string;
  label: string;
  /** A few words on what it is for. */
  hint: string;
  icon: IconName;
  /** Other words a person might type to find it. */
  keywords: string;
  run: (editor: Editor) => void;
}

/** The blocks an article can hold, in the order the menu lists them. */
export const blockChoices: readonly BlockChoice[] = [
  {
    id: "text",
    label: "Text",
    hint: "A plain paragraph",
    icon: "list",
    keywords: "paragraph plain",
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading",
    label: "Heading",
    hint: "A section of the article",
    icon: "text-h-two",
    keywords: "h2 title section",
    run: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "subheading",
    label: "Subheading",
    hint: "A part of a section",
    icon: "text-h-three",
    keywords: "h3 title",
    run: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: "bulleted-list",
    label: "Bulleted list",
    hint: "Points in no particular order",
    icon: "list-bullets",
    keywords: "ul unordered points",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numbered-list",
    label: "Numbered list",
    hint: "Steps to follow in order",
    icon: "list-numbers",
    keywords: "ol ordered steps",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    hint: "Words set apart from the rest",
    icon: "quotes",
    keywords: "blockquote citation",
    run: (editor) => editor.chain().focus().setBlockquote().run(),
  },
  {
    id: "code",
    label: "Code block",
    hint: "Code or a command to copy",
    icon: "code-block",
    keywords: "snippet pre terminal",
    run: (editor) => editor.chain().focus().setCodeBlock().run(),
  },
  {
    id: "note",
    label: "Note",
    hint: "A callout for something worth knowing",
    icon: "info",
    keywords: "callout info aside",
    run: (editor) => editor.chain().focus().setCallout("info").run(),
  },
  {
    id: "tip",
    label: "Tip",
    hint: "A callout for a shortcut or advice",
    icon: "lightbulb",
    keywords: "callout hint advice",
    run: (editor) => editor.chain().focus().setCallout("tip").run(),
  },
  {
    id: "warning",
    label: "Warning",
    hint: "A callout for something to be careful of",
    icon: "warning",
    keywords: "callout caution danger",
    run: (editor) => editor.chain().focus().setCallout("warning").run(),
  },
  {
    id: "video",
    label: "Video",
    hint: "A YouTube video",
    icon: "youtube-logo",
    keywords: "youtube embed film clip",
    run: (editor) => editor.chain().focus().insertVideoField().run(),
  },
  {
    id: "divider",
    label: "Divider",
    hint: "A line between two parts",
    icon: "minus",
    keywords: "rule hr line separator",
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

/** The choices whose name or keywords start a word with what was typed after the slash. */
export function matchBlocks(choices: readonly BlockChoice[], query: string): BlockChoice[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [...choices];
  return choices.filter((choice) =>
    `${choice.label} ${choice.keywords}`
      .toLowerCase()
      .split(" ")
      .some((word) => word.startsWith(wanted)),
  );
}
