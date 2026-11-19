import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "../../base/tooltip/tooltip";
import { IconPicker } from "./icon-picker";

// jsdom lays nothing out. The grid is given a box 324px wide (eight tiles to a row inside its
// padding) and 164px tall (four rows), as a browser would.
const box = { clientWidth: 324, clientHeight: 164 };
const original = Object.keys(box).map(
  (key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)] as const,
);

beforeAll(() => {
  for (const [key, size] of Object.entries(box)) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => size });
  }
});

afterAll(() => {
  for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
  }
});

// The icons arrive as a module of their own, which a busy test run can take a while to load.
const LOADED = 10_000;

interface PickerProps {
  initial?: string;
  onChange?: (value: string) => void;
}

function Picker({ initial = "book-open", onChange }: PickerProps) {
  const [value, setValue] = useState(initial);
  return (
    <TooltipProvider>
      <IconPicker
        label="Icon"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </TooltipProvider>
  );
}

async function openPicker(props: PickerProps = {}) {
  render(<Picker {...props} />);
  return screen.findByRole("listbox", { name: "Icon" }, { timeout: LOADED });
}

describe("IconPicker", () => {
  it("draws only the rows in view, out of every icon", async () => {
    const list = await openPicker();
    const options = within(list).getAllByRole("option");
    expect(Number(options[0]?.getAttribute("aria-setsize"))).toBeGreaterThan(1_400);
    // Four rows of eight in view, and a couple of rows either side at most.
    expect(options.length).toBeGreaterThanOrEqual(32);
    expect(options.length).toBeLessThanOrEqual(64);
  });

  it("marks the chosen icon, and every tile has a name", async () => {
    const list = await openPicker({ initial: "acorn" });
    expect(within(list).getByRole("option", { name: "Acorn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(list).getByRole("option", { name: "Address book" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("narrows the icons as you type, and says when none match", async () => {
    const user = userEvent.setup();
    const list = await openPicker();
    await user.type(screen.getByRole("searchbox", { name: "Search icons" }), "rocket");
    const first = within(list).getAllByRole("option").slice(0, 2);
    expect(first.map((option) => option.getAttribute("aria-label"))).toEqual([
      "Rocket",
      "Rocket launch",
    ]);

    await user.type(screen.getByRole("searchbox"), "zzqx");
    expect(screen.getByRole("heading", { name: "No icons match “rocketzzqx”" })).toBeVisible();
  });

  it("moves with the arrow keys and picks with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const list = await openPicker({ initial: "acorn", onChange });
    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{ArrowDown}");
    expect(within(list).getByRole("option", { name: "Acorn" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(within(list).getByRole("option", { name: "Address book" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAttribute("aria-posinset", "10");
    await user.keyboard("{Home}");
    expect(within(list).getByRole("option", { name: "Acorn" })).toHaveFocus();

    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("address-book");
    expect(within(list).getByRole("option", { name: "Address book" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Up from the first row goes back to the search field.
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("picks the best match with Enter in the search field, without sending a form", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const submit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Picker onChange={onChange} />
      </form>,
    );
    await screen.findByRole("listbox", {}, { timeout: LOADED });
    await user.type(screen.getByRole("searchbox"), "rocket{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("rocket");
    expect(submit).not.toHaveBeenCalled();
  });
});
