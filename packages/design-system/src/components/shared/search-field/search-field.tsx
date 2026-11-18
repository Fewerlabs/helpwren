"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";
import { Input, type InputProps } from "../../base/input/input";
import { Kbd } from "../../base/kbd/kbd";
import { Spinner } from "../../base/spinner/spinner";

export interface SearchFieldProps extends Omit<
  InputProps,
  "prepend" | "append" | "type" | "value" | "defaultValue" | "currency" | "formatter"
> {
  value?: string;
  defaultValue?: string;
  /** Called when Enter is pressed. */
  onSearch?: (value: string) => void;
  /** Shows a spinner in place of the magnifying glass while results load. */
  loading?: boolean;
  /** A keyboard shortcut to show while the field is empty, such as "⌘K". */
  shortcut?: ReactNode;
  /** The accessible name of the clear button. */
  clearLabel?: string;
}

/**
 * A search box with a magnifying glass, a clear button once there is text, and
 * room for a shortcut hint. It has no label of its own: give it `aria-label`, or
 * wrap it in a `Field`.
 */
export function SearchField({
  value,
  defaultValue = "",
  onValueChange,
  onSearch,
  onKeyDown,
  loading = false,
  shortcut,
  clearLabel = "Clear search",
  placeholder = "Search",
  ref,
  ...props
}: SearchFieldProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const inputRef = useRef<HTMLInputElement | null>(null);

  function change(next: string) {
    if (value === undefined) {
      setInternal(next);
    }
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Enter") {
      onSearch?.(current);
    } else if (event.key === "Escape" && current !== "") {
      event.preventDefault();
      change("");
    }
  }

  return (
    <Input
      type="search"
      // The browser's own clear button would duplicate ours.
      inputClassName="[&::-webkit-search-cancel-button]:hidden"
      placeholder={placeholder}
      value={current}
      onValueChange={change}
      onKeyDown={handleKeyDown}
      ref={(node) => {
        inputRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      prepend={
        loading ? (
          <Spinner label="Searching" />
        ) : (
          <Icon name="magnifying-glass" className="size-4" />
        )
      }
      append={
        current !== "" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mr-2"
            aria-label={clearLabel}
            onClick={() => {
              change("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" />
          </Button>
        ) : shortcut === undefined ? undefined : (
          <Kbd>{shortcut}</Kbd>
        )
      }
      {...props}
    />
  );
}
