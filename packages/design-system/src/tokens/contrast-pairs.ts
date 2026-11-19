/** WCAG AA for body text. */
export const TEXT = 4.5;
/** WCAG AA for the edges of controls and for focus indicators. */
export const EDGE = 3;

export interface ContrastPair {
  readonly foreground: string;
  readonly background: string;
  readonly minimum: number;
  readonly use: string;
}

function pairs(
  minimum: number,
  use: string,
  foregrounds: readonly string[],
  backgrounds: readonly string[],
): ContrastPair[] {
  return foregrounds.flatMap((foreground) =>
    backgrounds.map((background) => ({ foreground, background, minimum, use })),
  );
}

const statuses = ["open", "waiting", "resolved", "urgent", "closed"] as const;

/**
 * Every pair of tokens that is allowed to appear together. A new token must be
 * added here with the surfaces it may sit on; the contrast test checks each pair
 * in both themes.
 *
 * Not listed on purpose: `edge` on `muted`. Outlined controls sit on paper or
 * card, never on a muted surface.
 */
export const contrastPairs: readonly ContrastPair[] = [
  ...pairs(TEXT, "Body text", ["foreground"], ["background", "canvas", "card", "popover", "muted"]),
  ...pairs(TEXT, "Text on a card", ["card-foreground"], ["card"]),
  ...pairs(TEXT, "Text in a popover", ["popover-foreground"], ["popover"]),
  ...pairs(
    TEXT,
    "Secondary text",
    ["pencil", "muted-foreground"],
    ["background", "canvas", "card", "muted"],
  ),
  ...pairs(TEXT, "Links", ["biro"], ["background", "card", "muted"]),
  ...pairs(TEXT, "Accent text", ["moss"], ["background", "card"]),
  ...pairs(TEXT, "Marks, errors and destructive text", ["pen"], ["background", "card"]),
  ...pairs(TEXT, "Waiting text", ["ochre"], ["background", "card"]),
  ...pairs(TEXT, "Text on a primary button", ["primary-foreground"], ["primary"]),
  ...pairs(TEXT, "Text on a filled button", ["primary-fill-foreground"], ["primary-fill"]),
  ...pairs(TEXT, "Text on a destructive button", ["destructive-foreground"], ["destructive"]),
  ...pairs(TEXT, "Text on a secondary surface", ["secondary-foreground"], ["secondary"]),
  ...pairs(TEXT, "Text on a hovered item", ["accent-foreground"], ["accent"]),
  ...pairs(TEXT, "A highlighted word", ["highlighter-foreground"], ["highlighter"]),
  ...statuses.flatMap((status) =>
    pairs(TEXT, `Status chip: ${status}`, [`status-${status}`], [`status-${status}-surface`]),
  ),
  ...pairs(
    EDGE,
    "Edges of controls and cards",
    ["edge", "border", "input"],
    ["background", "card"],
  ),
  ...pairs(EDGE, "Focus ring", ["ring"], ["background", "card", "muted"]),
  ...pairs(EDGE, "Focus ring on an invalid control", ["destructive"], ["background", "card"]),
  ...pairs(
    EDGE,
    "Filled control against the page",
    ["primary", "destructive"],
    ["background", "card"],
  ),
];
