import { describe, expect, it } from "vitest";

import { caretAfterFormat, createNumberFormatter } from "./format";

describe("createNumberFormatter", () => {
  const money = createNumberFormatter();

  it.each([
    ["1000", "1,000"],
    ["1234567.5", "1,234,567.5"],
    ["999", "999"],
    ["1000.", "1,000."],
    ["0.5", "0.5"],
    ["", ""],
    ["12345678901234567890", "12,345,678,901,234,567,890"],
  ])("formats %j as %j", (raw, display) => {
    expect(money.format(raw)).toBe(display);
  });

  it.each([
    ["1,000", "1000"],
    ["$1,234.567", "1234.56"],
    ["007", "7"],
    [".5", "0.5"],
    ["abc", ""],
    ["1.2.3", "1.23"],
    ["-50", "50"],
  ])("parses %j as %j", (display, raw) => {
    expect(money.parse(display)).toBe(raw);
  });

  it("round-trips: parsing a formatted value gives the raw value back", () => {
    for (const raw of ["0", "12", "1000", "98765.43", "1000."]) {
      expect(money.parse(money.format(raw))).toBe(raw);
    }
  });

  it("drops the fraction when decimals is 0", () => {
    const whole = createNumberFormatter({ decimals: 0 });
    expect(whole.parse("1,000.75")).toBe("1000");
    expect(whole.format("1000.75")).toBe("1,000");
  });

  it("keeps a leading minus only when negatives are allowed", () => {
    const signed = createNumberFormatter({ allowNegative: true });
    expect(signed.format("-1000")).toBe("-1,000");
    expect(signed.parse("-")).toBe("-");
  });

  it("uses the locale's separators for display and a plain decimal for the raw value", () => {
    const german = createNumberFormatter({ locale: "de-DE" });
    expect(german.format("1234567.5")).toBe("1.234.567,5");
    expect(german.parse("1.234.567,5")).toBe("1234567.5");
  });
});

describe("caretAfterFormat", () => {
  const money = createNumberFormatter();

  it("moves the caret past a separator inserted before it", () => {
    // Typed the last 0 of "1000": caret after 4 raw characters, which is index 5 in "1,000".
    expect(caretAfterFormat(money, "1000", 4, "1,000")).toBe(5);
  });

  it("keeps the caret in place when editing in the middle", () => {
    // "1,2|34" with "5" typed at the caret gives "1,25|34" typed, "12,5|34" formatted.
    expect(caretAfterFormat(money, "1,2534", 4, "12,534")).toBe(4);
  });

  it("stays at the start when nothing is before the caret", () => {
    expect(caretAfterFormat(money, "1000", 0, "1,000")).toBe(0);
  });
});
