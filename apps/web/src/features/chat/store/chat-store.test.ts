import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  resetChatStore,
  useEndHelpFocus,
  useHelpFocus,
  useScreen,
  useSetHelpFocus,
  useShowScreen,
  useTab,
  type Screen,
} from "./chat-store";

describe("leaving the help a page opened", () => {
  beforeEach(resetChatStore);

  const chat = () =>
    renderHook(() => ({
      focus: useHelpFocus(),
      screen: useScreen(),
      tab: useTab(),
      setFocus: useSetHelpFocus(),
      end: useEndHelpFocus(),
      show: useShowScreen(),
    }));

  const catalog: Screen = { name: "collection", collection: { id: "1", name: "Catalog" } };

  it.each<Screen>([{ name: "help" }, catalog, { name: "article", slug: "add-a-service" }])(
    "goes home from $name, so the chat does not open there again",
    (screen) => {
      const { result, rerender } = chat();
      result.current.setFocus({ collections: ["catalog"], landing: false });
      result.current.show({ name: "help" });
      result.current.show(screen);
      result.current.end();
      rerender();
      expect(result.current).toMatchObject({ focus: null, screen: { name: "home" }, tab: "home" });
    },
  );

  it("keeps a conversation the visitor went on to", () => {
    const { result, rerender } = chat();
    result.current.setFocus({ collections: ["catalog"], landing: false });
    result.current.show({ name: "conversation", id: "1" });
    result.current.end();
    rerender();
    expect(result.current).toMatchObject({ focus: null, screen: { name: "conversation" } });
  });

  it("leaves an article alone when the page opened no help", () => {
    const { result, rerender } = chat();
    result.current.show({ name: "article", slug: "add-a-service" });
    result.current.end();
    rerender();
    expect(result.current.screen).toEqual({ name: "article", slug: "add-a-service" });
  });
});
