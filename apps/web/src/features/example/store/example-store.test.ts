import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  resetExampleStore,
  useComposerOpen,
  useSearch,
  useSetComposerOpen,
  useSetSearch,
} from "./example-store";

beforeEach(() => {
  resetExampleStore();
});

describe("example store", () => {
  it("starts with an empty search and the composer closed", () => {
    expect(renderHook(() => useSearch()).result.current).toBe("");
    expect(renderHook(() => useComposerOpen()).result.current).toBe(false);
  });

  it("shares a change with every component reading that value", () => {
    const first = renderHook(() => useSearch());
    const second = renderHook(() => useSearch());
    const setSearch = renderHook(() => useSetSearch());

    act(() => {
      setSearch.result.current("refund");
    });

    expect(first.result.current).toBe("refund");
    expect(second.result.current).toBe("refund");
  });

  it("does not re-render a component for a value it does not read", () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useSearch();
    });
    const setComposerOpen = renderHook(() => useSetComposerOpen());

    act(() => {
      setComposerOpen.result.current(true);
    });

    expect(renders).toBe(1);
  });
});
