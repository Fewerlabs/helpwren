import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { youtubeEmbedUrl, youtubeId } from "../rich-text/video";
import { VideoView } from "./video-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /** Adds the YouTube video an address points to, if it is one. */
      setVideo: (address: string) => ReturnType;
      /** Adds an empty video that asks for its YouTube link. */
      insertVideoField: () => ReturnType;
    };
  }
}

/**
 * A YouTube video, played in YouTube's privacy-enhanced player. Pasting a YouTube address on
 * its own adds one. Only the video's id is kept, so nothing but a YouTube video is ever framed.
 */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-youtube"),
        renderHTML: (attributes) => ({ "data-youtube": attributes.id as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = youtubeId(node.attrs.id);
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "hw-video" }),
      [
        "iframe",
        {
          src: id ? youtubeEmbedUrl(id) : "about:blank",
          title: "YouTube video",
          allow: "encrypted-media; picture-in-picture; fullscreen",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          // The editor keeps the frame still, so a click selects the video instead of playing it.
          tabindex: "-1",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideo:
        (address) =>
        ({ commands }) => {
          const id = youtubeId(address);
          return id ? commands.insertContent({ type: this.name, attrs: { id } }) : false;
        },
      insertVideoField:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { id: null } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const pasted = event.clipboardData?.getData("text/plain").trim() ?? "";
            if (!/^https?:\/\/\S+$/.test(pasted) || !youtubeId(pasted)) return false;
            return editor.commands.setVideo(pasted);
          },
        },
      }),
    ];
  },
});
