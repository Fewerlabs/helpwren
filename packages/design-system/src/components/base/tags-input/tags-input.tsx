"use client";

import {
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/cn";

import { ControlShell } from "../control-shell/control-shell";
import { bareInput } from "../styles";
import { Chip } from "./chip";

export interface TagRenderContext {
  value: string;
  index: number;
  disabled: boolean;
  remove: () => void;
}

export interface TagsInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "children"
> {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Keys and characters that finish a value. Default: Enter and comma. */
  separators?: readonly string[];
  /** Cleans up typed text before it becomes a value, for example lower-casing it. */
  transform?: (text: string) => string;
  /** Return false to reject a value. Receives the cleaned text and the current values. */
  validate?: (value: string, values: readonly string[]) => boolean;
  /** Allows the same value more than once. Default false. */
  allowDuplicates?: boolean;
  /** The most values allowed. */
  max?: number;
  /** Turns text left in the box into a value when focus leaves. Default true. */
  addOnBlur?: boolean;
  /** Replaces the default chip. Call `remove` from your own control to delete the value. */
  renderTag?: (context: TagRenderContext) => ReactNode;
  /** The accessible name of a chip's remove button. */
  removeLabel?: (value: string) => string;
  /** Content before the values, inside the box. */
  prepend?: ReactNode;
  /** Content after the text, inside the box. */
  append?: ReactNode;
  /** Classes for the inner `<input>`. `className` styles the outer box. */
  inputClassName?: string;
}

const DEFAULT_SEPARATORS = ["Enter", ","] as const;

/**
 * An input that holds several values and grows as they are added. Type a value
 * and press Enter or comma; Backspace in an empty box removes the last one.
 */
export function TagsInput({
  value,
  defaultValue,
  onValueChange,
  separators = DEFAULT_SEPARATORS,
  transform = (text) => text.trim(),
  validate,
  allowDuplicates = false,
  max,
  addOnBlur = true,
  renderTag,
  removeLabel = (tag) => `Remove ${tag}`,
  prepend,
  append,
  className,
  inputClassName,
  name,
  disabled = false,
  placeholder,
  onKeyDown,
  onPaste,
  onBlur,
  ...props
}: TagsInputProps) {
  const [internal, setInternal] = useState<readonly string[]>(defaultValue ?? []);
  const [text, setText] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const tags = value ?? internal;
  const full = max !== undefined && tags.length >= max;

  function commit(next: string[], message: string) {
    if (value === undefined) {
      setInternal(next);
    }
    setAnnouncement(message);
    onValueChange?.(next);
  }

  /** Adds every acceptable candidate and reports whether any were added. */
  function add(candidates: readonly string[]): boolean {
    const next = [...tags];
    const added: string[] = [];
    for (const candidate of candidates) {
      const cleaned = transform(candidate);
      const allowed =
        cleaned !== "" &&
        (max === undefined || next.length < max) &&
        (allowDuplicates || !next.includes(cleaned)) &&
        (validate === undefined || validate(cleaned, next));
      if (allowed) {
        next.push(cleaned);
        added.push(cleaned);
      }
    }
    if (added.length > 0) {
      commit(next, `Added ${added.join(", ")}`);
    }
    return added.length > 0;
  }

  function removeAt(index: number) {
    const removed = tags[index];
    if (removed === undefined) {
      return;
    }
    commit(
      tags.filter((_, position) => position !== index),
      `Removed ${removed}`,
    );
  }

  function split(input: string): string[] {
    const characters = separators.filter((separator) => separator.length === 1);
    const pattern = new RegExp(
      `[\\n\\t${characters.map((character) => `\\${character}`).join("")}]`,
    );
    return input.split(pattern);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) {
      return;
    }
    if (separators.includes(event.key)) {
      // Enter in an empty box is left alone so it can still submit a form.
      if (text.trim() !== "" || event.key !== "Enter") {
        event.preventDefault();
      }
      // Clear the box when the value was added, and when there was only white space in it.
      if (add([text]) || transform(text) === "") {
        setText("");
      }
    } else if (event.key === "Backspace" && text === "" && tags.length > 0) {
      event.preventDefault();
      removeAt(tags.length - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    const pasted = event.clipboardData.getData("text");
    const parts = split(pasted);
    if (event.defaultPrevented || parts.length < 2) {
      return;
    }
    event.preventDefault();
    add(parts);
  }

  return (
    <ControlShell
      data-slot="tags-input"
      // Tells assistive technology that the chips are part of a disabled control.
      role="group"
      aria-disabled={disabled || undefined}
      className={cn("flex-wrap gap-1.5 px-2 py-1", className)}
    >
      {prepend === undefined ? null : (
        <span className="text-muted-foreground flex shrink-0 items-center pl-1">{prepend}</span>
      )}
      {tags.map((tag, index) => {
        const remove = () => {
          removeAt(index);
        };
        return (
          <span key={`${tag}-${index}`} className="contents">
            {renderTag ? (
              renderTag({ value: tag, index, disabled, remove })
            ) : (
              <Chip removeLabel={removeLabel(tag)} onRemove={remove} disabled={disabled}>
                {tag}
              </Chip>
            )}
            {name === undefined ? null : <input type="hidden" name={name} value={tag} />}
          </span>
        );
      })}
      <input
        type="text"
        data-slot="tags-input-field"
        value={text}
        disabled={disabled}
        placeholder={tags.length === 0 ? placeholder : undefined}
        readOnly={full}
        autoComplete="off"
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={(event) => {
          onBlur?.(event);
          if (addOnBlur && add([text])) {
            setText("");
          }
        }}
        className={cn(bareInput, "h-7 min-w-24 px-1", inputClassName)}
        {...props}
      />
      {append === undefined ? null : (
        <span className="text-muted-foreground flex shrink-0 items-center pr-1">{append}</span>
      )}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </ControlShell>
  );
}
