"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";

import { Input as UiInput } from "#components/ui/input";
import { cn } from "#lib/cn";

import { ControlShell } from "../control-shell/control-shell";
import { bareInput } from "../styles";
import {
  caretAfterFormat,
  createNumberFormatter,
  type InputFormatter,
  type NumberFormatOptions,
} from "./format";

export interface InputProps extends Omit<ComponentProps<"input">, "value" | "defaultValue"> {
  /** The raw value. With a formatter this is the unformatted value, such as `1000` or `"1000.5"`. */
  value?: string | number;
  defaultValue?: string | number;
  /** Called with the raw value on every change: `"1000.5"`, never `"1,000.5"`. */
  onValueChange?: (value: string) => void;
  /** Content before the text, inside the box: an icon, a unit, a button, anything. */
  prepend?: ReactNode;
  /** Content after the text, inside the box. */
  append?: ReactNode;
  /**
   * Groups digits while typing, so 1000 shows as 1,000. Pass options to change the
   * locale, the number of decimals, or to allow negatives.
   */
  currency?: boolean | NumberFormatOptions;
  /** A custom formatter, for any other shape of value. Takes precedence over `currency`. */
  formatter?: InputFormatter;
  /** Classes for the inner `<input>`. `className` styles the outer box. */
  inputClassName?: string;
}

function sameValue(first: string, second: string): boolean {
  if (first === second) {
    return true;
  }
  // "1000" and "1000." are the same number; do not wipe the dot the person just typed.
  return first !== "" && second !== "" && Number(first) === Number(second);
}

function useFormatter(
  currency: InputProps["currency"],
  custom: InputFormatter | undefined,
): InputFormatter | undefined {
  const options = typeof currency === "object" ? currency : undefined;
  const enabled = currency !== undefined && currency !== false;
  const { locale, decimals, allowNegative } = options ?? {};

  const numberFormatter = useMemo(
    () =>
      enabled
        ? createNumberFormatter({
            ...(locale === undefined ? {} : { locale }),
            ...(decimals === undefined ? {} : { decimals }),
            ...(allowNegative === undefined ? {} : { allowNegative }),
          })
        : undefined,
    [enabled, locale, decimals, allowNegative],
  );
  return custom ?? numberFormatter;
}

/**
 * A single-line text input with optional content before and after the text, and
 * optional formatting of the value as it is typed. Pair it with a label, most
 * easily through `Field`.
 */
export function Input({
  value,
  defaultValue,
  onChange,
  onValueChange,
  prepend,
  append,
  currency,
  formatter: customFormatter,
  className,
  inputClassName,
  name,
  ref,
  inputMode,
  ...props
}: InputProps) {
  const formatter = useFormatter(currency, customFormatter);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const [raw, setRaw] = useState(() =>
    formatter ? formatter.parse(formatter.format(String(value ?? defaultValue ?? ""))) : "",
  );
  // A controlled value that really changed replaces what was typed.
  if (formatter && value !== undefined && !sameValue(String(value), raw)) {
    setRaw(formatter.parse(formatter.format(String(value))));
  }

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        return ref(node);
      }
      if (ref) {
        ref.current = node;
      }
      return undefined;
    },
    [ref],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (!formatter) {
      onValueChange?.(event.target.value);
      return;
    }
    const typed = event.target.value;
    const nextRaw = formatter.parse(typed);
    const caret = event.target.selectionStart ?? typed.length;
    pendingCaret.current = caretAfterFormat(formatter, typed, caret, formatter.format(nextRaw));
    setRaw(nextRaw);
    onValueChange?.(nextRaw);
  }

  const valueProps = formatter
    ? { value: formatter.format(raw) }
    : {
        ...(value === undefined ? {} : { value }),
        ...(defaultValue === undefined ? {} : { defaultValue }),
      };

  return (
    <ControlShell data-slot="input-shell" className={cn("gap-2 px-3", className)}>
      {prepend === undefined ? null : (
        <span
          data-slot="input-prepend"
          className="text-muted-foreground flex shrink-0 items-center"
        >
          {prepend}
        </span>
      )}
      <UiInput
        ref={setRefs}
        // With a formatter the visible text is formatted, so a hidden input submits the raw value.
        name={formatter ? undefined : name}
        inputMode={inputMode ?? (formatter && !customFormatter ? "decimal" : undefined)}
        onChange={handleChange}
        className={cn(
          bareInput,
          "h-auto self-stretch rounded-none border-0 p-0 text-base focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100 aria-invalid:ring-0 md:text-sm dark:bg-transparent dark:disabled:bg-transparent",
          inputClassName,
        )}
        {...valueProps}
        {...props}
      />
      {formatter && name !== undefined ? <input type="hidden" name={name} value={raw} /> : null}
      {append === undefined ? null : (
        <span data-slot="input-append" className="text-muted-foreground flex shrink-0 items-center">
          {append}
        </span>
      )}
    </ControlShell>
  );
}
