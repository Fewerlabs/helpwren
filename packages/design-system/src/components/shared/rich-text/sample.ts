import { type RichTextNode } from "./rich-text";

const words = (text: string, mark?: string): RichTextNode =>
  mark ? { type: "text", text, marks: [{ type: mark }] } : { type: "text", text };
const paragraph = (...content: RichTextNode[]): RichTextNode => ({ type: "paragraph", content });
const item = (text: string): RichTextNode => ({
  type: "listItem",
  content: [paragraph(words(text))],
});

/** An article that uses every kind of block, for stories and tests. */
export const sampleDoc: RichTextNode = {
  type: "doc",
  content: [
    paragraph(
      words("The chat is one small script. Add it once and it shows on "),
      words("every page", "bold"),
      words(" that loads it."),
    ),
    { type: "heading", attrs: { level: 2 }, content: [words("Before you start")] },
    {
      type: "bulletList",
      content: [item("You can edit your site's HTML."), item("You are an admin.")],
    },
    { type: "heading", attrs: { level: 2 }, content: [words("Add the snippet")] },
    {
      type: "orderedList",
      attrs: { start: 1 },
      content: [item("Open Settings, then Installation."), item("Copy the snippet.")],
    },
    {
      type: "codeBlock",
      attrs: { language: "html" },
      content: [words('<script src="https://support.example.com/widget.js" async></script>')],
    },
    {
      type: "callout",
      attrs: { tone: "tip" },
      content: [
        paragraph(words("Using a tag manager? Add the same snippet as a custom HTML tag.")),
      ],
    },
    { type: "heading", attrs: { level: 3 }, content: [words("If the button does not appear")] },
    paragraph(
      words("Check the "),
      {
        type: "text",
        text: "allowed sites",
        marks: [{ type: "link", attrs: { href: "/help/troubleshooting" } }],
      },
      words(", then look for "),
      words("widget.js", "code"),
      words(" in the page's source."),
    ),
    {
      type: "blockquote",
      content: [paragraph(words("Nine times in ten it is the allowed list."))],
    },
    {
      type: "callout",
      attrs: { tone: "warning" },
      content: [paragraph(words("An empty list allows every site."))],
    },
    { type: "horizontalRule" },
    {
      type: "callout",
      attrs: { tone: "info" },
      content: [paragraph(words("Still stuck? Start a chat and tell us the address of the page."))],
    },
  ],
};
