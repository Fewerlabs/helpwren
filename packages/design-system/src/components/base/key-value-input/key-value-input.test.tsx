import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { KeyValueInput, type KeyValuePair } from "./key-value-input";

function Harness({
  initial = [],
  onChange,
  max,
}: {
  initial?: KeyValuePair[];
  onChange: (value: KeyValuePair[]) => void;
  max?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <KeyValueInput
      value={value}
      max={max}
      transformKey={(key) => key.toLowerCase()}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("KeyValueInput", () => {
  it("adds a row, and edits its name and value", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Add field" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Field 1 name" }), "Plan");
    await userEvent.type(screen.getByRole("textbox", { name: "Field 1 value" }), "pro");

    expect(onChange).toHaveBeenLastCalledWith([{ key: "plan", value: "pro" }]);
  });

  it("removes a row with its own button", async () => {
    const onChange = vi.fn();
    render(
      <Harness
        initial={[
          { key: "plan", value: "pro" },
          { key: "feature", value: "calendar" },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove field 1" }));
    expect(onChange).toHaveBeenLastCalledWith([{ key: "feature", value: "calendar" }]);
  });

  it("stops offering to add once it is full", () => {
    render(<Harness initial={[{ key: "plan", value: "pro" }]} max={1} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Add field" })).not.toBeInTheDocument();
  });
});
