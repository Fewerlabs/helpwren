"use client";

import {
  useId,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/cn";

import { ControlShell } from "../control-shell/control-shell";
import { Popover, PopoverAnchor, PopoverContent } from "../popover/popover";
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
  /**
   * Values to offer while typing, such as the tags already in use. Those that hold the text
   * typed are listed under the box, best first; the arrow keys move through them and Enter
   * adds one. Anything else can still be typed.
   */
  suggestions?: readonly string[];
}

/** The most suggestions listed at once. */
const SUGGESTIONS_SHOWN = 6;

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
  suggestions,
  name,
  disabled = false,
  placeholder,
  onKeyDown,
  onPaste,
  onBlur,
  onFocus,
  ...props
}: TagsInputProps) {
  const [internal, setInternal] = useState<readonly string[]>(defaultValue ?? []);
  const [text, setText] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const tags = value ?? internal;
  const full = max !== undefined && tags.length >= max;

  // What the text typed so far could become: values that start with it first, then any that
  // hold it, leaving out those already added.
  const typed = transform(text);
  const offered = (suggestions ?? [])
    .filter((suggestion) => !tags.includes(suggestion) && suggestion.includes(typed))
    .sort((first, second) => Number(second.startsWith(typed)) - Number(first.startsWith(typed)))
    .slice(0, SUGGESTIONS_SHOWN);
  const listOpen = focused && !full && !disabled && offered.length > 0;
  const activeOption = listOpen && active >= 0 && active < offered.length ? active : -1;

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
    if (listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = activeOption + step;
      // Past either end goes back to the text, with nothing chosen.
      setActive(next >= offered.length ? -1 : next < -1 ? offered.length - 1 : next);
      return;
    }
    if (listOpen && event.key === "Escape" && activeOption >= 0) {
      event.preventDefault();
      setActive(-1);
      return;
    }
    const chosen = offered[activeOption];
    if (event.key === "Enter" && chosen !== undefined) {
      event.preventDefault();
      if (add([chosen])) {
        setText("");
      }
      setActive(-1);
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

  const shell = (
    <ControlShell
      data-slot="tags-input"
      // Tells assistive technology that the chips are part of a disabled control.
      role="group"
      aria-disabled={disabled || undefined}
      className={cn("flex-wrap gap-1.5 px-2 py-(--hw-control-pad,0.25rem)", className)}
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
        {...(suggestions === undefined
          ? {}
          : {
              role: "combobox",
              "aria-autocomplete": "list" as const,
              "aria-expanded": listOpen,
              "aria-controls": listId,
              "aria-activedescendant": activeOption >= 0 ? `${listId}-${activeOption}` : undefined,
            })}
        onChange={(event) => {
          setText(event.target.value);
          setActive(-1);
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={(event) => {
          onFocus?.(event);
          setFocused(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setFocused(false);
          setActive(-1);
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

  if (suggestions === undefined) {
    return shell;
  }
  return (
    <Popover open={listOpen}>
      <PopoverAnchor asChild>{shell}</PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-48 gap-0 p-1"
        // Focus stays in the input, which moves through the list with aria-activedescendant.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <div id={listId} role="listbox" aria-label="Suggestions">
          {offered.map((suggestion, index) => (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- options are operated from the input through aria-activedescendant; they never take focus themselves.
            <div
              key={suggestion}
              id={`${listId}-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeOption}
              data-active={index === activeOption || undefined}
              onMouseMove={() => {
                setActive(index);
              }}
              onMouseDown={(event) => {
                // Keeps focus in the input.
                event.preventDefault();
              }}
              onClick={() => {
                if (add([suggestion])) {
                  setText("");
                }
                setActive(-1);
              }}
              className="data-active:bg-accent data-active:text-accent-foreground flex min-h-8 cursor-default items-center rounded-md px-2 py-1 text-sm select-none"
            >
              {suggestion}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
