import { mergeAttributes, Node } from "@tiptap/core";

export const calloutTones = ["info", "tip", "warning"] as const;
export type CalloutTone = (typeof calloutTones)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the selected blocks in a callout, or changes the tone of the one they are in. */
      setCallout: (tone: CalloutTone) => ReturnType;
      /** Takes the selected blocks back out of their callout. */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * A callout: a tinted box that sets a note, a tip or a warning apart from the text around it.
 * It holds ordinary blocks, so a callout can carry a list or two paragraphs.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-tone") ?? "info",
        renderHTML: (attributes) => ({ "data-tone": attributes.tone as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.hw-callout" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "hw-callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (tone) =>
        ({ commands, editor }) =>
          editor.isActive(this.name)
            ? commands.updateAttributes(this.name, { tone })
            : commands.wrapIn(this.name, { tone }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
