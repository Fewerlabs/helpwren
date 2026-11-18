import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagsInput } from "./tags-input";

function setup(props: Partial<Parameters<typeof TagsInput>[0]> = {}) {
  const onValueChange = vi.fn();
  render(<TagsInput aria-label="Tags" onValueChange={onValueChange} {...props} />);
  return { input: screen.getByRole("textbox", { name: "Tags" }), onValueChange };
}

describe("TagsInput", () => {
  it("adds a value on Enter and on comma, and clears the text", async () => {
    const { input, onValueChange } = setup();

    await userEvent.type(input, "billing{Enter}refunds,");

    expect(onValueChange).toHaveBeenLastCalledWith(["billing", "refunds"]);
    expect(screen.getByText("billing")).toBeInTheDocument();
    expect(screen.getByText("refunds")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("removes a value with its button and the last value with Backspace", async () => {
    const { input, onValueChange } = setup({ defaultValue: ["billing", "refunds", "ios"] });

    await userEvent.click(screen.getByRole("button", { name: "Remove refunds" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["billing", "ios"]);

    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["billing"]);
  });

  it("ignores empty text and duplicates", async () => {
    const { input, onValueChange } = setup({ defaultValue: ["billing"] });
    await userEvent.type(input, "   {Enter}billing{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("billing");
  });

  it("cleans values with transform and rejects those that fail validate", async () => {
    const { input, onValueChange } = setup({
      transform: (text) => text.trim().toLowerCase(),
      validate: (value) => value.includes("."),
    });
    await userEvent.type(input, "  Glown.IO {Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["glown.io"]);

    await userEvent.type(input, "nodot{Enter}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("adds every value from a pasted list", async () => {
    const { input, onValueChange } = setup();
    await userEvent.click(input);
    await userEvent.paste("billing, refunds\nios");
    expect(onValueChange).toHaveBeenLastCalledWith(["billing", "refunds", "ios"]);
  });

  it("turns text left in the box into a value when focus leaves", async () => {
    const { input, onValueChange } = setup();
    await userEvent.type(input, "billing");
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(["billing"]);
  });

  it("stops at max", async () => {
    const { input, onValueChange } = setup({ defaultValue: ["one"], max: 2 });
    await userEvent.type(input, "two{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["one", "two"]);
    expect(input).toHaveAttribute("readonly");
  });

  it("works as a controlled component", async () => {
    const { input, onValueChange } = setup({ value: ["fixed"] });
    await userEvent.type(input, "new{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(["fixed", "new"]);
    expect(screen.queryByText("new")).not.toBeInTheDocument();
  });

  it("submits each value under its name", () => {
    const { container } = render(
      <form>
        <TagsInput aria-label="Tags" name="tags" defaultValue={["billing", "ios"]} />
      </form>,
    );
    const form = container.querySelector("form");
    expect(new FormData(form ?? undefined).getAll("tags")).toEqual(["billing", "ios"]);
  });

  it("renders custom tags and lets them remove themselves", async () => {
    const { onValueChange } = setup({
      defaultValue: ["billing"],
      renderTag: ({ value, remove }) => (
        <button type="button" onClick={remove}>
          drop {value}
        </button>
      ),
    });
    await userEvent.click(screen.getByRole("button", { name: "drop billing" }));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  it("does nothing when disabled", () => {
    setup({ defaultValue: ["billing"], disabled: true });
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove billing" })).toBeDisabled();
  });
});
