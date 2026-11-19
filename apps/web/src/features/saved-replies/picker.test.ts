import { type SavedReply } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { filterSavedReplies, findSlashQuery, pickerKey, replaceRange } from "./picker";

function reply(title: string, shortcut: string | null): SavedReply {
  return {
    id: crypto.randomUUID(),
    title,
    body: `${title} body`,
    shortcut,
    visibility: "team",
    ownerId: null,
    createdBy: null,
    createdAt: "2026-11-19T10:00:00Z",
    updatedAt: "2026-11-19T10:00:00Z",
  };
}

const greeting = reply("Greeting", "hi");
const refund = reply("Refund policy", "refund");
const shipping = reply("Shipping times", "ship");
const thanks = reply("Thanks for your patience", null);
const all = [greeting, refund, shipping, thanks];

describe("filterSavedReplies", () => {
  it("lists every reply when nothing is typed", () => {
    expect(filterSavedReplies(all, "")).toEqual(all);
  });

  it("matches the title and the shortcut, whatever the case", () => {
    expect(filterSavedReplies(all, "POLICY")).toEqual([refund]);
    expect(filterSavedReplies(all, "ship")).toEqual([shipping]);
    expect(filterSavedReplies(all, "nothing like it")).toEqual([]);
  });

  it("puts an exact shortcut first, then what starts with the words, then the rest", () => {
    const hint = reply("Hints and tips", "tips");
    const chip = reply("Order with a chip", "order-hi");
    expect(filterSavedReplies([chip, hint, thanks, greeting], "hi")).toEqual([
      greeting,
      hint,
      chip,
    ]);
  });

  it("finds a word inside a title", () => {
    expect(filterSavedReplies(all, "patience")).toEqual([thanks]);
  });
});

describe("findSlashQuery", () => {
  it("opens at the start of the box or of a line, and after a space", () => {
    expect(findSlashQuery("/", 1)).toEqual({ start: 0, end: 1, query: "" });
    expect(findSlashQuery("/ref", 4)).toEqual({ start: 0, end: 4, query: "ref" });
    expect(findSlashQuery("Thanks!\n/re", 11)).toEqual({ start: 8, end: 11, query: "re" });
    expect(findSlashQuery("Hello /hi", 9)).toEqual({ start: 6, end: 9, query: "hi" });
  });

  it("does not open inside a link, a date or a word", () => {
    expect(findSlashQuery("example.com/help", 16)).toBeNull();
    expect(findSlashQuery("on 1/2", 6)).toBeNull();
    expect(findSlashQuery("http://x", 8)).toBeNull();
  });

  it("closes once a space follows the query", () => {
    expect(findSlashQuery("/hi there", 9)).toBeNull();
  });

  it("looks only at what is before the caret", () => {
    expect(findSlashQuery("/hi there", 3)).toEqual({ start: 0, end: 3, query: "hi" });
  });
});

describe("replaceRange", () => {
  it("puts the reply where the query was, and the caret after it", () => {
    expect(replaceRange("Hello /hi!", { start: 6, end: 9 }, "Hi Jordan")).toEqual({
      text: "Hello Hi Jordan!",
      caret: 15,
    });
  });
});

describe("pickerKey", () => {
  it("moves with the arrows and wraps around at either end", () => {
    expect(pickerKey("ArrowDown", 0, 3)).toEqual({ type: "move", index: 1 });
    expect(pickerKey("ArrowDown", 2, 3)).toEqual({ type: "move", index: 0 });
    expect(pickerKey("ArrowUp", 0, 3)).toEqual({ type: "move", index: 2 });
    expect(pickerKey("Home", 2, 3)).toEqual({ type: "move", index: 0 });
    expect(pickerKey("End", 0, 3)).toEqual({ type: "move", index: 2 });
  });

  it("chooses with Enter or Tab, and closes with Escape", () => {
    expect(pickerKey("Enter", 1, 3)).toEqual({ type: "pick" });
    expect(pickerKey("Tab", 1, 3)).toEqual({ type: "pick" });
    expect(pickerKey("Escape", 1, 3)).toEqual({ type: "close" });
  });

  it("leaves other keys to the text, and has nothing to choose from an empty list", () => {
    expect(pickerKey("a", 0, 3)).toBeNull();
    expect(pickerKey("Enter", 0, 0)).toBeNull();
    expect(pickerKey("Escape", 0, 0)).toEqual({ type: "close" });
  });
});
