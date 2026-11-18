import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";

import { matchBlocks, type BlockChoice } from "./blocks";

/** What the editor's screen needs to draw the block menu while a slash command is typed. */
export interface SlashMenuState {
  items: BlockChoice[];
  /** Where the typed slash is on screen, to put the menu under it. */
  rect: DOMRect | null;
  choose: (choice: BlockChoice) => void;
}

export interface SlashOptions {
  /** Every block on offer. Read each time, so it can change after the editor is made. */
  choices: () => readonly BlockChoice[];
  /** Called as the menu opens, changes and closes (`null`). */
  onChange: (state: SlashMenuState | null) => void;
  /** Lets the menu take the arrow keys and Enter. Returns true when it used the key. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Typing `/` opens a menu of blocks, narrowed by what is typed next, as in Notion. Choosing one
 * removes the typed command and adds the block in its place.
 */
export const Slash = Extension.create<SlashOptions>({
  name: "slash",

  addOptions() {
    return { choices: () => [], onChange: () => undefined, onKeyDown: () => false };
  },

  addProseMirrorPlugins() {
    const { choices, onChange, onKeyDown } = this.options;
    return [
      Suggestion<BlockChoice, BlockChoice>({
        editor: this.editor,
        pluginKey: new PluginKey("slash"),
        char: "/",
        // Inside code a slash is only a slash.
        allow: ({ editor }) => !editor.isActive("codeBlock") && !editor.isActive("code"),
        items: ({ query }) => matchBlocks(choices(), query),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: () => {
          const show = (props: {
            items: BlockChoice[];
            clientRect?: (() => DOMRect | null) | null;
            command: (choice: BlockChoice) => void;
          }) => {
            onChange({
              items: props.items,
              rect: props.clientRect?.() ?? null,
              choose: props.command,
            });
          };
          return {
            onStart: show,
            onUpdate: show,
            onKeyDown: ({ event }) => onKeyDown(event),
            onExit: () => {
              onChange(null);
            },
          };
        },
      }),
    ];
  },
});
