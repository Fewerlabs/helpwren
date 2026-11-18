import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Field } from "../field/field";
import { Combobox, type ComboboxOption } from "./combobox";
import type { ComboboxLoader } from "./use-async-options";

const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
  { value: "damson", label: "Damson" },
];

interface Person {
  id: number;
  name: string;
}

const people: Person[] = Array.from({ length: 45 }, (_, index) => ({
  id: index + 1,
  name: `Person ${index + 1}`,
}));
const personProps = {
  getOptionValue: (person: Person) => person.id,
  getOptionLabel: (person: Person) => person.name,
  debounceMs: 0,
};

function pagedLoader(pageSize = 20) {
  return vi.fn<ComboboxLoader<Person, number>>(({ search, cursor = 0 }) => {
    const matches = people.filter((person) => person.name.includes(search));
    const next = cursor + pageSize;
    return Promise.resolve({
      options: matches.slice(cursor, next),
      nextCursor: next < matches.length ? next : undefined,
    });
  });
}

// jsdom has no IntersectionObserver. This one lets a test say "the end of the list is visible".
let reachEndOfList: () => void = () => undefined;
beforeEach(() => {
  class ObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly scrollMargin = "";
    readonly thresholds = [];
    constructor(callback: IntersectionObserverCallback) {
      reachEndOfList = () => {
        callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
      };
    }
    observe(): void {
      // Nothing to observe without layout.
    }
    unobserve(): void {
      // See observe().
    }
    disconnect(): void {
      reachEndOfList = () => undefined;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Lets pending effects settle, then reports the end of the list as visible. */
async function scrollToEnd() {
  await act(async () => {
    await Promise.resolve();
  });
  act(() => {
    reachEndOfList();
  });
}

describe("Combobox with a fixed list", () => {
  it("opens on click and lists the options", async () => {
    render(<Combobox aria-label="Fruit" options={fruits} />);
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(input);

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("filters as you type and chooses with the keyboard", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.click(input);
    await user.keyboard("an");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Banana"]);

    await user.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("banana", fruits[1]);
    expect(input).toHaveValue("Banana");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("moves through options with the arrow keys, skipping disabled ones", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} />);
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.tab();
    await user.keyboard("{ArrowDown}");
    const active = () => document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
    expect(active()).toHaveTextContent("Apple");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toHaveTextContent("Damson");
    await user.keyboard("{ArrowDown}");
    expect(active()).toHaveTextContent("Apple");
    await user.keyboard("{ArrowUp}");
    expect(active()).toHaveTextContent("Damson");
  });

  it("does not choose a disabled option", async () => {
    const onValueChange = vi.fn();
    render(<Combobox aria-label="Fruit" options={fruits} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("closes with Escape and discards the search", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} defaultValue="apple" />);
    const input = screen.getByRole("combobox", { name: "Fruit" });

    await user.click(input);
    await user.keyboard("dam");
    await user.keyboard("{Escape}");

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Apple");
  });

  it("says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Fruit" options={fruits} messages={{ empty: "No fruit found" }} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(screen.getByText("No fruit found")).toBeInTheDocument();
  });

  it("clears the selection with the clear button", async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        aria-label="Fruit"
        options={fruits}
        defaultValue="apple"
        clearable
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledWith(null, null);
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveValue("");
  });

  it("is labelled, described and marked invalid by a Field", () => {
    render(
      <Field label="Fruit" hint="Pick one." error="Choose a fruit.">
        <Combobox options={fruits} />
      </Field>,
    );
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Choose a fruit.");
  });

  it("submits its value with a form", () => {
    const { container } = render(
      <form>
        <Combobox aria-label="Fruit" name="fruit" options={fruits} defaultValue="banana" />
      </form>,
    );
    expect(new FormData(container.querySelector("form") ?? undefined).get("fruit")).toBe("banana");
  });

  it("uses custom renderers for options and for the value", async () => {
    render(
      <Combobox
        aria-label="Fruit"
        options={fruits}
        defaultValue="apple"
        renderValue={(option) => <strong>Chosen: {option.label}</strong>}
        renderOption={(option, { selected }) => (
          <span>
            {option.label}
            {selected ? " (current)" : ""}
          </span>
        )}
      />,
    );
    expect(screen.getByText("Chosen: Apple")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(screen.getByRole("option", { name: "Apple (current)" })).toBeInTheDocument();
  });
});

describe("Combobox with multiple values", () => {
  it("shows each value as a chip and toggles options without closing", async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        multiple
        aria-label="Fruit"
        options={fruits}
        defaultValue={["apple"]}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Fruit" });
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeInTheDocument();

    await userEvent.click(input);
    await userEvent.click(screen.getByRole("option", { name: "Banana" }));

    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "banana"], [fruits[0], fruits[1]]);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");

    await userEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["banana"], [fruits[1]]);
  });

  it("removes a value with its chip button, and the last one with Backspace", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Combobox
        multiple
        aria-label="Fruit"
        options={fruits}
        defaultValue={["apple", "banana", "damson"]}
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Remove Banana" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["apple", "damson"], [fruits[0], fruits[3]]);

    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["apple"], [fruits[0]]);
  });

  it("submits every value with a form", () => {
    const { container } = render(
      <form>
        <Combobox
          multiple
          aria-label="Fruit"
          name="fruit"
          options={fruits}
          defaultValue={["apple", "damson"]}
        />
      </form>,
    );
    expect(new FormData(container.querySelector("form") ?? undefined).getAll("fruit")).toEqual([
      "apple",
      "damson",
    ]);
  });
});

describe("Combobox with options loaded from a server", () => {
  it("loads the first page when opened, not before", async () => {
    const loadOptions = pagedLoader();
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
      />,
    );
    expect(loadOptions).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("combobox", { name: "Person" }));

    expect(await screen.findByRole("option", { name: "Person 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(20);
    expect(loadOptions).toHaveBeenCalledWith(
      expect.objectContaining({ search: "", cursor: undefined }),
    );
  });

  it("sends the search text to the server", async () => {
    const loadOptions = pagedLoader();
    const user = userEvent.setup();
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Person" }));
    await screen.findByRole("option", { name: "Person 1" });
    await user.keyboard("Person 4");

    await waitFor(() => {
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Person 4",
        "Person 40",
        "Person 41",
        "Person 42",
        "Person 43",
        "Person 44",
        "Person 45",
      ]);
    });
    expect(loadOptions).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Person 4" }));
  });

  it("loads the next page when the end of the list is reached, until there are no more", async () => {
    const loadOptions = pagedLoader();
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Person" }));
    await screen.findByRole("option", { name: "Person 20" });

    await scrollToEnd();
    expect(await screen.findByRole("option", { name: "Person 40" })).toBeInTheDocument();
    expect(loadOptions).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 20 }));

    await scrollToEnd();
    expect(await screen.findByRole("option", { name: "Person 45" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(45);

    await scrollToEnd();
    expect(loadOptions).toHaveBeenCalledTimes(3);
  });

  it("ignores a slow response for an earlier search", async () => {
    const resolvers = new Map<string, (people: Person[]) => void>();
    const loadOptions: ComboboxLoader<Person, number> = ({ search }) =>
      new Promise((resolve) => {
        resolvers.set(search, (options) => {
          resolve({ options });
        });
      });
    const user = userEvent.setup();
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Person" }));
    await waitFor(() => {
      expect(resolvers.has("")).toBe(true);
    });
    await user.keyboard("x");
    await waitFor(() => {
      expect(resolvers.has("x")).toBe(true);
    });

    act(() => {
      resolvers.get("x")?.([{ id: 900, name: "From the latest search" }]);
    });
    await screen.findByRole("option", { name: "From the latest search" });
    act(() => {
      resolvers.get("")?.([{ id: 901, name: "From the stale search" }]);
    });

    expect(screen.queryByRole("option", { name: "From the stale search" })).not.toBeInTheDocument();
  });

  it("shows a spinner in the box while options load, in place of the leading icon or the caret", async () => {
    let release: () => void = () => undefined;
    const loadOptions: ComboboxLoader<Person, number> = () =>
      new Promise((resolve) => {
        release = () => {
          resolve({ options: people.slice(0, 2) });
        };
      });
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
        prepend={<span data-testid="leading">@</span>}
      />,
    );
    expect(screen.getByTestId("leading")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Person" }));

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByTestId("leading")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    act(() => {
      release();
    });
    await screen.findByRole("option", { name: "Person 1" });
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.getByTestId("leading")).toBeInTheDocument();
  });

  it("shows an error with a way to try again", async () => {
    const loadOptions = vi
      .fn<ComboboxLoader<Person, number>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ options: people.slice(0, 2) });
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={loadOptions}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: "Person" }));
    expect(await screen.findByText("The options could not be loaded.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("option", { name: "Person 1" })).toBeInTheDocument();
  });
});

describe("Combobox with a prefilled value", () => {
  it("looks up a value that is not in any loaded list, once, and shows its label", async () => {
    const resolveOptions = vi.fn((ids: readonly number[]) =>
      Promise.resolve(people.filter((person) => ids.includes(person.id))),
    );
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={pagedLoader()}
        resolveOptions={resolveOptions}
        value={44}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Person" });
    expect(input).toHaveValue("Loading…");

    await waitFor(() => {
      expect(input).toHaveValue("Person 44");
    });
    expect(resolveOptions).toHaveBeenCalledTimes(1);
    expect(resolveOptions).toHaveBeenCalledWith([44], expect.any(AbortSignal));
  });

  it("looks up several missing values in one request", async () => {
    const resolveOptions = vi.fn((ids: readonly number[]) =>
      Promise.resolve(people.filter((person) => ids.includes(person.id))),
    );
    render(
      <Combobox<Person, number, number>
        multiple
        aria-label="People"
        {...personProps}
        loadOptions={pagedLoader()}
        resolveOptions={resolveOptions}
        defaultValue={[3, 44]}
      />,
    );
    expect(await screen.findByRole("button", { name: "Remove Person 44" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Person 3" })).toBeInTheDocument();
    expect(resolveOptions).toHaveBeenCalledTimes(1);
    expect(resolveOptions).toHaveBeenCalledWith([3, 44], expect.any(AbortSignal));
  });

  it("does not look up values whose options were handed in", () => {
    const resolveOptions = vi.fn(() => Promise.resolve([]));
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={pagedLoader()}
        resolveOptions={resolveOptions}
        selectedOptions={[{ id: 44, name: "Person 44" }]}
        value={44}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Person" })).toHaveValue("Person 44");
    expect(resolveOptions).not.toHaveBeenCalled();
  });

  it("falls back to the raw value when the lookup fails", async () => {
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={pagedLoader()}
        resolveOptions={() => Promise.reject(new Error("offline"))}
        value={44}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Person" })).toHaveValue("44");
    });
  });

  it("keeps the label of a chosen option after the search that found it is gone", async () => {
    const user = userEvent.setup();
    render(
      <Combobox<Person, number, number>
        aria-label="Person"
        {...personProps}
        loadOptions={pagedLoader()}
      />,
    );
    const input = screen.getByRole("combobox", { name: "Person" });

    await user.click(input);
    await screen.findByRole("option", { name: "Person 1" });
    await user.keyboard("Person 45");
    await user.click(await screen.findByRole("option", { name: "Person 45" }));

    expect(input).toHaveValue("Person 45");
    await user.click(input);
    await screen.findByRole("option", { name: "Person 1" });
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("Person 45");
  });
});
