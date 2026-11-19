import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";
import { Input } from "../../base/input/input";
import { youtubeEmbedUrl, youtubeId } from "../rich-text/video";

/**
 * A video in the editor. Until it has one, it asks for a YouTube link; after, it shows the
 * video, still under a cover so a click selects the block, to move or delete, instead of
 * playing it.
 */
export function VideoView({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const id = youtubeId(node.attrs.id);
  const fieldId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const empty = !id;
  // Just chosen from the block menu, so the link goes straight in. The menu hands focus back
  // to the writing on the next frame, so the field takes it after that.
  useEffect(() => {
    if (!empty || !editor.isEditable) return undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => field.current?.focus());
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [empty, editor]);

  if (id) {
    return (
      <NodeViewWrapper
        className={cn("hw-video relative", selected && "outline-ring outline-2 outline-offset-2")}
        data-drag-handle=""
      >
        <iframe
          src={youtubeEmbedUrl(id)}
          title="YouTube video"
          allow="encrypted-media; picture-in-picture; fullscreen"
          tabIndex={-1}
        />
        <span aria-hidden="true" className="absolute inset-0" />
      </NodeViewWrapper>
    );
  }

  function save() {
    const found = youtubeId(value);
    if (found) updateAttributes({ id: found });
    else setError(true);
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className="border-rule bg-muted/50 my-4 grid gap-2 rounded-xl border border-dashed p-4"
    >
      <label htmlFor={fieldId} className="flex items-center gap-2 text-sm font-medium">
        <Icon name="youtube-logo" className="size-4" />
        YouTube video
      </label>
      <div className="flex gap-2">
        <Input
          id={fieldId}
          value={value}
          placeholder="https://www.youtube.com/watch?v=…"
          ref={field}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="h-9 min-h-9 flex-1"
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            } else if (event.key === "Escape" || (event.key === "Backspace" && value === "")) {
              event.preventDefault();
              deleteNode();
              editor.commands.focus();
            }
          }}
        />
        <Button type="button" size="sm" className="h-9" onClick={save}>
          Add video
        </Button>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-destructive text-xs">
          That is not a YouTube link. Paste the address of a video, such as a watch page or a
          youtu.be link.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Paste the link to a YouTube video, then press Enter. Escape removes this block.
        </p>
      )}
    </NodeViewWrapper>
  );
}
