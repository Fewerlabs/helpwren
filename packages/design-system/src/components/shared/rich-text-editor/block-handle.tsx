"use client";

import { type Editor } from "@tiptap/core";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { type Node } from "@tiptap/pm/model";
import { type ComponentProps, useCallback, useRef, useState } from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";
import { Popover, PopoverContent, PopoverTrigger } from "../../base/popover/popover";
import { Tooltip } from "../../base/tooltip/tooltip";
import { type BlockChoice } from "./blocks";

export interface BlockHandleProps {
  editor: Editor;
  /** What a block can be turned into. */
  choices: readonly BlockChoice[];
  /** Called just before the handle changes the document, so the change counts as the person's. */
  onUse: () => void;
}

/** The blocks that only make sense as something new, not as another form of the block in hand. */
const NOT_A_FORM = ["divider", "picture"];

/**
 * Made once. The handle is set up again whenever these change, and setting it up again closes
 * any menu the editor has open, so they must not be new on every draw.
 */
const position: NonNullable<ComponentProps<typeof DragHandle>["computePositionConfig"]> = {
  placement: "left-start",
};

const grip =
  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring grid h-6 place-items-center rounded-md focus-visible:outline-2";

/**
 * The two small controls that appear beside the block under the pointer, as in Notion: a plus
 * that adds a block below it, and a grip that drags the block to a new place or, when pressed,
 * opens what can be done to it: turn it into another kind, duplicate it or delete it.
 */
export function BlockHandle({ editor, choices, onUse }: BlockHandleProps) {
  const [open, setOpen] = useState(false);
  /** The block the handle is beside, and where it starts in the document. */
  const block = useRef<{ node: Node; pos: number } | null>(null);

  /** The block the open menu is about: the handle may follow the pointer elsewhere meanwhile. */
  const chosen = useRef<{ node: Node; pos: number } | null>(null);

  const track = useCallback(({ node, pos }: { node: Node | null; pos: number }) => {
    block.current = node ? { node, pos } : null;
  }, []);

  function toggle(next: boolean) {
    if (next) chosen.current = block.current;
    setOpen(next);
  }

  function act(change: (current: { node: Node; pos: number }) => void, from = chosen) {
    const current = from.current;
    setOpen(false);
    if (!current) return;
    onUse();
    change(current);
  }

  return (
    <DragHandle editor={editor} computePositionConfig={position} onNodeChange={track}>
      <div className="flex items-center gap-px pt-0.5 pr-1.5">
        <Tooltip content="Add a block below">
          <button
            type="button"
            aria-label="Add a block below"
            className={cn(grip, "w-6")}
            onClick={() => {
              act(({ node, pos }) => {
                const after = pos + node.nodeSize;
                // A new line with a slash on it, which opens the block menu there.
                editor
                  .chain()
                  .focus()
                  .insertContentAt(after, { type: "paragraph" })
                  .setTextSelection(after + 1)
                  .insertContent("/")
                  .run();
              }, block);
            }}
          >
            <Icon name="plus" className="size-4" />
          </button>
        </Tooltip>
        <Popover open={open} onOpenChange={toggle}>
          <Tooltip content="Drag to move, click for options">
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Block options"
                className={cn(grip, "w-4.5 cursor-grab active:cursor-grabbing")}
              >
                <Icon name="dots-six-vertical" weight="bold" className="size-4" />
              </button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent side="left" align="start" className="grid w-56 gap-px p-1.5">
            <p className="text-muted-foreground text-2xs px-2 pt-1 pb-0.5 font-mono tracking-wider uppercase">
              Turn into
            </p>
            {choices
              .filter((choice) => !NOT_A_FORM.includes(choice.id))
              .map((choice) => (
                <Button
                  key={choice.id}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => {
                    act(({ pos }) => {
                      // The caret goes into the block first, so the change lands on it.
                      editor
                        .chain()
                        .focus()
                        .setTextSelection(pos + 1)
                        .run();
                      choice.run(editor);
                    });
                  }}
                >
                  <Icon name={choice.icon} />
                  {choice.label}
                </Button>
              ))}
            <span aria-hidden="true" className="bg-rule my-1 h-px" />
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal"
              onClick={() => {
                act(({ node, pos }) => {
                  editor
                    .chain()
                    .focus()
                    // A document node never changes once made, so the same one can stand in two places.
                    .insertContentAt(pos + node.nodeSize, node)
                    .run();
                });
              }}
            >
              <Icon name="copy" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive justify-start font-normal"
              onClick={() => {
                act(({ node, pos }) => {
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from: pos, to: pos + node.nodeSize })
                    .run();
                });
              }}
            >
              <Icon name="trash" />
              Delete
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </DragHandle>
  );
}
