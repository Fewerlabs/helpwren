import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { hexToHsv, hsvToHex } from "./color";
import { ColorPicker, type ColorValue } from "./color-picker";

const swatches = [
  { label: "Moss", color: "#3d6b57" },
  { label: "Ocean", color: "#1d4ed8", to: "#38bdf8" },
];

function Picker({ onChange }: { onChange?: (value: ColorValue) => void }) {
  const [value, setValue] = useState<ColorValue>({ color: "#3d6b57" });
  return (
    <ColorPicker
      label="Brand colour"
      swatches={swatches}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("colour conversion", () => {
  it("goes to hue, saturation and brightness and back without drifting", () => {
    for (const hex of ["#3d6b57", "#1d4ed8", "#ffffff", "#000000", "#facc15", "#808080"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("not a colour")).toEqual({ h: 0, s: 0, v: 0 });
  });
});

describe("ColorPicker", () => {
  it("marks the chosen swatch and passes on a gradient with both its colours", async () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Brand colour" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Moss" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Ocean" }));
    expect(onChange).toHaveBeenCalledWith({ color: "#1d4ed8", to: "#38bdf8" });
    expect(screen.getByRole("button", { name: "Ocean" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Custom colour" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("takes any other colour from the picker, by hex, by hue or with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Custom colour" }));
    const hex = screen.getByRole("textbox", { name: "Hex colour" });
    expect(hex).toHaveValue("#3d6b57");

    // A half-typed colour is not passed on.
    await user.clear(hex);
    await user.type(hex, "#ff00");
    expect(onChange).not.toHaveBeenCalled();
    await user.type(hex, "00");
    expect(onChange).toHaveBeenLastCalledWith({ color: "#ff0000" });
    expect(screen.getByRole("button", { name: "Custom colour" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(screen.getByRole("slider", { name: "Hue" }), { target: { value: "120" } });
    expect(onChange).toHaveBeenLastCalledWith({ color: "#00ff00" });
    expect(hex).toHaveValue("#00ff00");

    screen.getByRole("slider", { name: "Saturation and brightness" }).focus();
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith({ color: "#00e600" });
  });

  it("can be turned off", () => {
    render(
      <ColorPicker
        label="Brand colour"
        swatches={swatches}
        value={{ color: "#3d6b57" }}
        onValueChange={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Moss" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Custom colour" })).toBeDisabled();
  });
});
