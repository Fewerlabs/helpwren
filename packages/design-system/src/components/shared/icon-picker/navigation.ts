/**
 * Where a key moves the active tile in a grid of `count` tiles, `columns` to a row, or `null`
 * when the key does not move it. Up from the first row is `null` too, so the picker can hand
 * focus back to the search field. Page Up and Page Down move by `page` rows.
 */
export function nextIndex(
  key: string,
  index: number,
  count: number,
  columns: number,
  page: number,
): number | null {
  const last = count - 1;
  const row = Math.floor(index / columns);
  const lastRow = Math.floor(last / columns);
  switch (key) {
    case "ArrowRight":
      return Math.min(index + 1, last);
    case "ArrowLeft":
      return Math.max(index - 1, 0);
    // From a full row onto a shorter last one, the last tile is the nearest.
    case "ArrowDown":
      return row < lastRow ? Math.min(index + columns, last) : index;
    case "ArrowUp":
      return row > 0 ? index - columns : null;
    case "PageDown":
      return Math.min(index + columns * page, last);
    case "PageUp":
      return Math.max(index - columns * page, 0);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
