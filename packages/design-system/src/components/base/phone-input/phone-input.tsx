"use client";

import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";
import { useMemo, useState } from "react";

import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
} from "#components/ui/select";
import { cn } from "#lib/cn";

import type { InputFormatter } from "../input/format";
import { Input, type InputProps } from "../input/input";
import { caretFlip, focusRing } from "../styles";
import { flagOf, listCountries } from "./countries";

export interface PhoneDetails {
  /** The selected country. */
  country: CountryCode;
  /** The number as typed, digits only, without the country code. */
  nationalNumber: string;
  /** Whether this is a complete, real number for the selected country. */
  isValid: boolean;
}

export interface PhoneInputProps extends Omit<
  InputProps,
  "value" | "defaultValue" | "onValueChange" | "prepend" | "currency" | "formatter" | "type"
> {
  /** The full number in international form, such as `+442079460958`. */
  value?: string;
  defaultValue?: string;
  /** Called with the number in international form, or an empty string when there are no digits. */
  onValueChange?: (value: string, details: PhoneDetails) => void;
  /** The country to start with when the value does not say. Default `US`. */
  defaultCountry?: CountryCode;
  onCountryChange?: (country: CountryCode) => void;
  /** Limits the list to these countries. */
  countries?: readonly CountryCode[];
  /** Countries to show at the top of the list. */
  preferredCountries?: readonly CountryCode[];
  /** The language for country names. Default `en`. */
  locale?: string;
  /** The accessible name of the country selector. */
  countryLabel?: string;
}

interface Parts {
  country: CountryCode;
  /** National digits as typed, or an international number still being typed ("+4"). */
  raw: string;
}

/** Keeps digits, and a leading plus so a country code can be typed or pasted. */
function clean(text: string): string {
  const trimmed = text.trim();
  // "00" is how many countries dial out internationally.
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  return international ? `+${trimmed.startsWith("00") ? digits.slice(2) : digits}` : digits;
}

/** Splits a number into its country and national part, recognising a country code if it has one. */
function split(text: string, fallback: CountryCode): Parts {
  const raw = clean(text);
  if (!raw.startsWith("+")) {
    return { country: fallback, raw };
  }
  const complete = parsePhoneNumberFromString(raw);
  if (complete?.country) {
    return { country: complete.country, raw: complete.formatNational().replace(/\D/g, "") };
  }
  const typer = new AsYouType();
  typer.input(raw);
  const country = typer.getCountry();
  // Until the code identifies a country, keep what was typed.
  return country
    ? { country, raw: typer.getNumber()?.nationalNumber ?? "" }
    : { country: fallback, raw };
}

function international({ country, raw }: Parts): string {
  if (raw === "" || raw === "+") {
    return "";
  }
  if (raw.startsWith("+")) {
    return raw;
  }
  return (
    parsePhoneNumberFromString(raw, country)?.number ??
    `+${getCountryCallingCode(country)}${raw.replace(/^0+/, "")}`
  );
}

function isValid({ country, raw }: Parts): boolean {
  return parsePhoneNumberFromString(raw, country)?.isValid() ?? false;
}

/**
 * A phone number input. The country selector in front shows a flag and dialling
 * code; choose another country there, or type or paste a number with its country
 * code and the country is recognised for you. The number is formatted as it is
 * typed, and the value is always the full international number.
 */
export function PhoneInput({
  value,
  defaultValue,
  onValueChange,
  defaultCountry = "US",
  onCountryChange,
  countries: only,
  preferredCountries,
  locale = "en",
  countryLabel = "Country",
  name,
  disabled,
  placeholder,
  autoComplete = "tel",
  ...props
}: PhoneInputProps) {
  const [parts, setParts] = useState<Parts>(() =>
    split(value ?? defaultValue ?? "", defaultCountry),
  );
  // A controlled value that differs from what is shown replaces it.
  if (value !== undefined && value !== international(parts)) {
    setParts(split(value, parts.country));
  }

  const countries = useMemo(
    () => listCountries(locale, only, preferredCountries),
    [locale, only, preferredCountries],
  );

  const { country } = parts;
  const formatter = useMemo<InputFormatter>(
    () => ({
      parse: clean,
      format: (raw) => (raw.startsWith("+") ? raw : new AsYouType(country).input(raw)),
    }),
    [country],
  );

  function update(next: Parts) {
    if (next.country !== parts.country) {
      onCountryChange?.(next.country);
    }
    setParts(next);
    onValueChange?.(international(next), {
      country: next.country,
      nationalNumber: next.raw.replace(/\D/g, ""),
      isValid: isValid(next),
    });
  }

  return (
    <>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        formatter={formatter}
        value={parts.raw}
        onValueChange={(raw) => {
          update(split(raw, parts.country));
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="pl-1"
        prepend={
          <UiSelect
            value={country}
            onValueChange={(next) => {
              // Keep the digits and reinterpret them for the new country.
              update({ country: next as CountryCode, raw: parts.raw.replace(/^\+/, "") });
            }}
            {...(disabled === undefined ? {} : { disabled })}
          >
            <UiSelectTrigger
              aria-label={countryLabel}
              className={cn(
                "text-foreground hover:bg-muted dark:hover:bg-muted h-8 gap-1 border-0 bg-transparent px-2 data-[size=default]:h-8 dark:bg-transparent",
                caretFlip,
                focusRing,
              )}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {flagOf(country)}
              </span>
              <span className="text-sm tabular-nums">+{getCountryCallingCode(country)}</span>
            </UiSelectTrigger>
            <UiSelectContent
              position="popper"
              align="start"
              sideOffset={10}
              className="border-line border-border max-h-72 w-72 rounded-lg ring-0"
            >
              {countries.map((item) => (
                <UiSelectItem key={item.code} value={item.code} textValue={item.name}>
                  <span aria-hidden="true">{item.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="text-muted-foreground tabular-nums">+{item.callingCode}</span>
                </UiSelectItem>
              ))}
            </UiSelectContent>
          </UiSelect>
        }
        {...props}
      />
      {name === undefined ? null : <input type="hidden" name={name} value={international(parts)} />}
    </>
  );
}
