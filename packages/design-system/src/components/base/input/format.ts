/**
 * Turns what a person types into what the input shows, and back.
 *
 * `raw` is the plain value your code works with ("1000.5"); `display` is the
 * text in the input ("1,000.5"). `parse(format(raw))` must give `raw` back.
 */
export interface InputFormatter {
  /** Raw value to display text. */
  format: (raw: string) => string;
  /** Display text (or anything typed or pasted) to raw value. */
  parse: (display: string) => string;
}

export interface NumberFormatOptions {
  /** BCP 47 locale that decides the group and decimal separators. Default `en-US`. */
  locale?: string;
  /** The most digits allowed after the decimal separator. Default 2; 0 for whole numbers. */
  decimals?: number;
  /** Allows a leading minus sign. Default false. */
  allowNegative?: boolean;
}

function separators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

/**
 * Groups digits as they are typed: 1000 becomes 1,000. The raw value is a plain
 * decimal string such as "1000.5", ready for `Number()` or a decimal library.
 */
export function createNumberFormatter({
  locale = "en-US",
  decimals = 2,
  allowNegative = false,
}: NumberFormatOptions = {}): InputFormatter {
  const { group, decimal } = separators(locale);
  const integerFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  function parse(display: string): string {
    const negative = allowNegative && display.trimStart().startsWith("-");
    // Display text uses the locale's separators; the raw value always uses ".".
    const [integerPart = "", ...fractionParts] = display.replaceAll(group, "").split(decimal);
    const integer = integerPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const hasFraction = decimals > 0 && fractionParts.length > 0;
    const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, decimals);

    if (integer === "" && !hasFraction) {
      return negative ? "-" : "";
    }
    return `${negative ? "-" : ""}${integer === "" ? "0" : integer}${hasFraction ? `.${fraction}` : ""}`;
  }

  function format(raw: string): string {
    const canonical = parse(raw.replaceAll(".", decimal));
    if (canonical === "" || canonical === "-") {
      return canonical;
    }
    const negative = canonical.startsWith("-");
    const [integer = "0", fraction] = canonical.replace("-", "").split(".");
    const grouped = integerFormat.format(BigInt(integer));
    return `${negative ? "-" : ""}${grouped}${fraction === undefined ? "" : `${decimal}${fraction}`}`;
  }

  return { format, parse };
}

/**
 * Where the caret belongs after the text was reformatted: after the same number
 * of raw characters as before, so it does not jump when a separator is inserted.
 */
export function caretAfterFormat(
  formatter: InputFormatter,
  typed: string,
  caret: number,
  formatted: string,
): number {
  const rawBeforeCaret = formatter.parse(typed.slice(0, caret)).length;
  for (let index = 0; index <= formatted.length; index += 1) {
    if (formatter.parse(formatted.slice(0, index)).length >= rawBeforeCaret) {
      return index;
    }
  }
  return formatted.length;
}
