import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { flagOf, listCountries } from "./countries";
import { PhoneInput } from "./phone-input";

function setup(props: Partial<Parameters<typeof PhoneInput>[0]> = {}) {
  const onValueChange = vi.fn();
  render(<PhoneInput aria-label="Phone" onValueChange={onValueChange} {...props} />);
  return {
    input: screen.getByRole("textbox", { name: "Phone" }),
    country: screen.getByRole("combobox", { name: "Country" }),
    onValueChange,
  };
}

describe("PhoneInput", () => {
  it("starts on the default country and shows its flag and dialling code", () => {
    const { country } = setup({ defaultCountry: "GB" });
    expect(country).toHaveTextContent("+44");
    expect(country).toHaveTextContent(flagOf("GB"));
  });

  it("formats the number as it is typed and reports it in international form", async () => {
    const { input, onValueChange } = setup({ defaultCountry: "US" });

    await userEvent.type(input, "2015550123");

    expect(input).toHaveValue("(201) 555-0123");
    expect(onValueChange).toHaveBeenLastCalledWith("+12015550123", {
      country: "US",
      nationalNumber: "2015550123",
      isValid: true,
    });
  });

  it("recognises the country when a full international number is pasted", async () => {
    const { input, country, onValueChange } = setup({ defaultCountry: "US" });

    await userEvent.click(input);
    await userEvent.paste("+44 20 7946 0958");

    expect(country).toHaveTextContent("+44");
    expect(country).toHaveTextContent(flagOf("GB"));
    expect(input).toHaveValue("020 7946 0958");
    expect(onValueChange).toHaveBeenLastCalledWith(
      "+442079460958",
      expect.objectContaining({ country: "GB", isValid: true }),
    );
  });

  it("also recognises a pasted number that starts with 00, and messy formatting", async () => {
    const { input, country } = setup({ defaultCountry: "US" });
    await userEvent.click(input);
    await userEvent.paste("  0049 (30) 901820 ");
    expect(country).toHaveTextContent("+49");
    expect(input).toHaveValue("030 901820");
  });

  it("recognises the country while a code is being typed", async () => {
    const { input, country } = setup({ defaultCountry: "US" });
    await userEvent.type(input, "+2348031234567");
    expect(country).toHaveTextContent("+234");
    expect(country).toHaveTextContent(flagOf("NG"));
  });

  it("keeps the digits and reformats them when another country is chosen", async () => {
    const user = userEvent.setup();
    const { input, country, onValueChange } = setup({ defaultCountry: "US" });
    await user.type(input, "2079460958");

    await user.click(country);
    await user.click(await screen.findByRole("option", { name: /United Kingdom/ }));

    expect(country).toHaveTextContent("+44");
    expect(onValueChange).toHaveBeenLastCalledWith(
      "+442079460958",
      expect.objectContaining({ country: "GB" }),
    );
  });

  it("says when a number is not valid for its country", async () => {
    const { input, onValueChange } = setup({ defaultCountry: "US" });
    await userEvent.type(input, "12345");
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ isValid: false }),
    );
  });

  it("reports an empty string when the number is cleared", async () => {
    const { input, onValueChange } = setup({ defaultValue: "+12015550123" });
    await userEvent.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith("", expect.objectContaining({ isValid: false }));
  });

  it("shows a prefilled international number under the right country", () => {
    const { input, country } = setup({ defaultValue: "+33142685300" });
    expect(country).toHaveTextContent("+33");
    expect(input).toHaveValue("01 42 68 53 00");
  });

  it("follows a controlled value", async () => {
    function Controlled() {
      const [phone, setPhone] = useState("+12015550123");
      return (
        <>
          <PhoneInput aria-label="Phone" value={phone} onValueChange={setPhone} />
          <button
            type="button"
            onClick={() => {
              setPhone("+442079460958");
            }}
          >
            Use UK number
          </button>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(input).toHaveValue("(201) 555-0123");

    await userEvent.click(screen.getByRole("button", { name: "Use UK number" }));

    expect(input).toHaveValue("020 7946 0958");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("+44");
  });

  it("submits the international number with a form", () => {
    const { container } = render(
      <form>
        <PhoneInput aria-label="Phone" name="phone" defaultValue="+442079460958" />
      </form>,
    );
    expect(new FormData(container.querySelector("form") ?? undefined).get("phone")).toBe(
      "+442079460958",
    );
  });

  it("disables the number and the country selector together", () => {
    const { input, country } = setup({ disabled: true });
    expect(input).toBeDisabled();
    expect(country).toBeDisabled();
  });
});

describe("listCountries", () => {
  it("names countries in the given language, sorted, with preferred ones first", () => {
    const countries = listCountries("en", undefined, ["NG", "GB"]);
    expect(countries.slice(0, 2).map((country) => country.code)).toEqual(["NG", "GB"]);
    expect(countries.find((country) => country.code === "DE")).toMatchObject({
      name: "Germany",
      callingCode: "49",
    });
    expect(countries.length).toBeGreaterThan(200);
  });

  it("can be limited to some countries", () => {
    expect(listCountries("en", ["US", "CA"]).map((country) => country.code)).toEqual(["CA", "US"]);
  });
});
