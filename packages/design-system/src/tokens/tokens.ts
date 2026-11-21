/**
 * Token names for use in TypeScript, for example in inline SVG or a `style` prop.
 * Values are CSS variable references, so they follow the active theme. The colour
 * values themselves live only in tokens.css.
 */
const colorNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-fill",
  "primary-fill-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "paper",
  "canvas",
  "well",
  "ink",
  "pencil",
  "edge",
  "rule",
  "moss",
  "pen",
  "highlighter",
  "highlighter-foreground",
  "biro",
  "ochre",
] as const;

export const statusNames = ["open", "waiting", "resolved", "urgent", "closed"] as const;

export type ColorToken = (typeof colorNames)[number];
export type StatusName = (typeof statusNames)[number];

function reference<Name extends string>(name: Name): `var(--${Name})` {
  return `var(--${name})`;
}

export const tokens = {
  color: Object.fromEntries(colorNames.map((name) => [name, reference(name)])) as {
    readonly [Name in ColorToken]: `var(--${Name})`;
  },
  status: Object.fromEntries(
    statusNames.map((name) => [
      name,
      { text: reference(`status-${name}`), surface: reference(`status-${name}-surface`) },
    ]),
  ) as {
    readonly [Name in StatusName]: {
      readonly text: `var(--status-${Name})`;
      readonly surface: `var(--status-${Name}-surface)`;
    };
  },
  radius: { control: "var(--radius)", card: "calc(var(--radius) + 6px)" },
  line: "var(--line)",
  font: { sans: "var(--font-sans)", mono: "var(--font-mono)", hand: "var(--font-hand)" },
} as const;

/** CSS variables an adopter may set on any ancestor of Helpwren UI to re-brand it. */
export const themeOverrides = {
  accent: "--helpwren-accent",
  accentForeground: "--helpwren-accent-foreground",
  font: "--helpwren-font",
  radius: "--helpwren-radius",
} as const;
