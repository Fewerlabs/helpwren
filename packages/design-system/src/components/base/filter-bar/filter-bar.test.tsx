import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { InlineSelect } from "../inline-select/inline-select";
import { FilterBar, type FilterDefinition, type FilterValue } from "./filter-bar";

const filters: FilterDefinition[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "open", label: "Open" },
      { value: "waiting", label: "Waiting" },
      { value: "resolved", label: "Resolved" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    options: [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ],
  },
];

function Bar({
  initial = {},
  onChange,
}: {
  initial?: FilterValue;
  onChange?: (v: FilterValue) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <FilterBar
      filters={filters}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("FilterBar", () => {
  it("adds a filter, opens it at once, and lets several values be chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Bar onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("option", { name: "Status" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: [] });

    const options = await screen.findByRole("listbox", { name: "Status" });
    await user.click(within(options).getByRole("option", { name: "Open" }));
    await user.click(within(options).getByRole("option", { name: "Waiting" }));

    expect(onChange).toHaveBeenLastCalledWith({ status: ["open", "waiting"] });
    expect(within(options).getByRole("option", { name: "Open" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: /Status: Open, Waiting/ })).toBeInTheDocument();
  });

  it("unpicks a chosen value, and says Any when none is", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Bar initial={{ status: ["open"] }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Status: Open/ }));
    await user.click(screen.getByRole("option", { name: "Open" }));

    expect(onChange).toHaveBeenLastCalledWith({ status: [] });
    expect(screen.getByRole("button", { name: /Status: Any/ })).toBeInTheDocument();
  });

  it("shortens a long choice", () => {
    render(<Bar initial={{ status: ["open", "waiting", "resolved"] }} />);
    expect(screen.getByRole("button", { name: /Status: Open \+2/ })).toBeInTheDocument();
  });

  it("removes a filter, and offers it again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Bar initial={{ status: ["open"], priority: ["high"] }} onChange={onChange} />);
    // Every filter is in use, so there is nothing left to add.
    expect(screen.queryByRole("button", { name: "Filter" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove the Status filter" }));

    expect(onChange).toHaveBeenLastCalledWith({ priority: ["high"] });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("option", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Priority" })).not.toBeInTheDocument();
  });

  it("is driven from the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Bar initial={{ priority: [] }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Priority: Any/ }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith({ priority: ["high"] });
  });
});

describe("InlineSelect", () => {
  const options = ["Ada", "Sam", "Kofi", "Mei", "Noor", "Ines", "Tomas", "Lena"].map((name) => ({
    value: name,
    label: name,
  }));

  function Assignee({ onChange }: { onChange: (value: string) => void }) {
    const [value, setValue] = useState("Ada");
    return (
      <InlineSelect
        label="Assignee"
        value={value}
        options={options}
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      >
        {value}
      </InlineSelect>
    );
  }

  it("shows the value, opens a list, and closes on choosing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Assignee onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: /^Assignee:/ });
    expect(trigger).toHaveTextContent("Ada");
    await user.click(trigger);
    expect(screen.getByRole("option", { name: "Ada" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("option", { name: "Sam" }));

    expect(onChange).toHaveBeenCalledWith("Sam");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("Sam");
  });

  it("filters a long list as you type, and picks with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Assignee onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /^Assignee:/ }));
    await user.type(screen.getByRole("combobox", { name: "Search assignee" }), "no");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("Noor");
  });

  it("says so when nothing matches, and does not report a change for the same value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Assignee onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /^Assignee:/ }));
    await user.type(screen.getByRole("combobox", { name: "Search assignee" }), "zzz");
    expect(screen.getByText("Nothing found")).toBeInTheDocument();

    await user.clear(screen.getByRole("combobox", { name: "Search assignee" }));
    await user.click(screen.getByRole("option", { name: "Ada" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
