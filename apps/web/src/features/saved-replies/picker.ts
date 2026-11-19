import { type SavedReply } from "@helpwren/core";

/**
 * The saved replies that match what was typed, best first: a shortcut that matches exactly,
 * then shortcuts and titles that start with it, then any that contain it. Every reply when
 * nothing is typed. The browser holds the whole set (a team has tens, not thousands), so this
 * is the full answer, and quick enough to run on every keystroke.
 */
export function filterSavedReplies(replies: readonly SavedReply[], query: string): SavedReply[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [...replies];

  const rank = (reply: SavedReply) => {
    const shortcut = reply.shortcut ?? "";
    const title = reply.title.toLowerCase();
    if (shortcut === wanted) return 0;
    if (shortcut.startsWith(wanted)) return 1;
    if (title.startsWith(wanted)) return 2;
    if (title.split(/\s+/).some((word) => word.startsWith(wanted))) return 3;
    if (title.includes(wanted) || shortcut.includes(wanted)) return 4;
    return undefined;
  };

  return replies
    .flatMap((reply) => {
      const score = rank(reply);
      return score === undefined ? [] : [{ reply, score }];
    })
    .sort((first, second) => first.score - second.score)
    .map(({ reply }) => reply);
}

/** A `/` being typed in the reply box: where it starts and what follows it so far. */
export interface SlashQuery {
  start: number;
  end: number;
  query: string;
}

/**
 * The `/query` the caret is at the end of, if any. It counts only at the start of a line or
 * after a space, so a link such as `example.com/help` or a date like `1/2` opens nothing.
 */
export function findSlashQuery(text: string, caret: number): SlashQuery | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)\/([^\s/]*)$/.exec(before);
  if (!match) return null;
  const query = match[2] ?? "";
  return { start: caret - query.length - 1, end: caret, query };
}

/** Puts text in place of part of the box's contents, and says where the caret goes after it. */
export function replaceRange(
  text: string,
  range: { start: number; end: number },
  insert: string,
): { text: string; caret: number } {
  return {
    text: text.slice(0, range.start) + insert + text.slice(range.end),
    caret: range.start + insert.length,
  };
}

/** What a key does to an open list of choices. */
export type PickerAction =
  { type: "move"; index: number } | { type: "pick" } | { type: "close" } | null;

/**
 * The keys of an open list: the arrows move through it and wrap around, Enter and Tab choose,
 * Escape closes. Any other key belongs to the text.
 */
export function pickerKey(key: string, active: number, count: number): PickerAction {
  if (key === "Escape") return { type: "close" };
  if (count === 0) return null;
  if (key === "ArrowDown") return { type: "move", index: (active + 1) % count };
  if (key === "ArrowUp") return { type: "move", index: (active - 1 + count) % count };
  if (key === "Home") return { type: "move", index: 0 };
  if (key === "End") return { type: "move", index: count - 1 };
  if (key === "Enter" || key === "Tab") return { type: "pick" };
  return null;
}
