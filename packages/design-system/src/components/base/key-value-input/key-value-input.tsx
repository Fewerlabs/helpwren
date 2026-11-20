"use client";

import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { Input } from "../input/input";

/** One row of a key and value list. */
export interface KeyValuePair {
  key: string;
  value: string;
}

export interface KeyValueInputProps {
  value: readonly KeyValuePair[];
  onValueChange: (value: KeyValuePair[]) => void;
  /** What one row is, for its controls' names: "Field" gives "Field 1 name". Default "Field". */
  noun?: string | undefined;
  /** Hints inside the empty boxes, such as `plan` and `pro`. */
  keyPlaceholder?: string | undefined;
  valuePlaceholder?: string | undefined;
  /** Cleans up a key as it is typed, for example lower-casing it. */
  transformKey?: ((key: string) => string) | undefined;
  /** The most rows allowed. The Add button goes away once it is reached. */
  max?: number | undefined;
  /** The Add button's words. Default "Add field". */
  addLabel?: string | undefined;
  /** Marks rows whose key is wrong, by their place in the list. */
  invalidRows?: readonly number[] | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * A short list of names and values to edit in place, such as an article's custom fields:
 * a row for each, removed with its own button, and a button to add one. Rows keep the order
 * they were added in.
 */
export function KeyValueInput({
  value,
  onValueChange,
  noun = "Field",
  keyPlaceholder = "name",
  valuePlaceholder = "value",
  transformKey = (key) => key,
  max,
  addLabel = "Add field",
  invalidRows = [],
  disabled = false,
  className,
}: KeyValueInputProps) {
  const change = (index: number, part: Partial<KeyValuePair>) => {
    onValueChange(value.map((row, at) => (at === index ? { ...row, ...part } : row)));
  };

  return (
    <div data-slot="key-value-input" className={cn("grid gap-2", className)}>
      {value.map((row, index) => {
        const invalid = invalidRows.includes(index) || undefined;
        return (
          // Rows have no identity of their own, so their place in the list is their key.
          <div key={index} className="flex items-center gap-2">
            <Input
              aria-label={`${noun} ${String(index + 1)} name`}
              aria-invalid={invalid}
              value={row.key}
              placeholder={keyPlaceholder}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="w-2/5 font-mono"
              disabled={disabled}
              onValueChange={(key) => {
                change(index, { key: transformKey(key) });
              }}
            />
            <Input
              aria-label={`${noun} ${String(index + 1)} value`}
              value={row.value}
              placeholder={valuePlaceholder}
              autoComplete="off"
              className="min-w-0 flex-1"
              disabled={disabled}
              onValueChange={(text) => {
                change(index, { value: text });
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${noun.toLowerCase()} ${String(index + 1)}`}
              disabled={disabled}
              onClick={() => {
                onValueChange(value.filter((_, at) => at !== index));
              }}
            >
              <Icon name="x" />
            </Button>
          </div>
        );
      })}
      {max === undefined || value.length < max ? (
        <Button
          variant="secondary"
          size="sm"
          className="w-fit"
          disabled={disabled}
          onClick={() => {
            onValueChange([...value, { key: "", value: "" }]);
          }}
        >
          <Icon name="plus" />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
