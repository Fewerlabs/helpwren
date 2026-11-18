/**
 * How the launcher and the panel look and where they sit. The install's own choices arrive
 * from `GET /api/widget`; anything missing or malformed falls back to these defaults, so a
 * widget is never left unstyled by a bad answer.
 */
export interface Appearance {
  position: "right" | "left";
  /** Pixels from the side and from the bottom of the page. */
  offsetX: number;
  offsetY: number;
  /** A chat bubble, a chat bubble with the wren in it, or the install's logo when it has one. */
  launcher: "chat" | "logo" | "wren";
  /** The launcher's colour, as `#rrggbb`. */
  accent: string;
  /** A second colour the launcher fades to. */
  accentTo?: string | undefined;
  /** The colour of the icon on the launcher. */
  accentInk: string;
  /** The address of the install's logo. */
  logo?: string | undefined;
  /** The install's name, shown beside its welcome message. */
  name: string;
  /** A message shown beside the launcher before the chat is opened. */
  welcome?: string | undefined;
  /** Replies offered under the welcome message. Tapping one opens the chat with it. */
  quickReplies: readonly string[];
}

export const defaultAppearance: Appearance = {
  position: "right",
  offsetX: 20,
  offsetY: 20,
  launcher: "chat",
  accent: "#3d6b57",
  accentInk: "#ffffff",
  name: "",
  quickReplies: [],
};

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_OFFSET = 120;

const hex = (value: unknown): string | undefined =>
  typeof value === "string" && HEX.test(value) ? value : undefined;

const offset = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_OFFSET, Math.max(0, Math.round(value)))
    : fallback;

/** Text is only ever put on the page as text, so it is checked for type and length alone. */
const text = (value: unknown, max: number): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : undefined;

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks an appearance from outside, value by value, on top of the one already in use. Every
 * value ends up in a style or an attribute, so nothing unchecked is let through.
 */
export function parseAppearance(data: unknown, base: Appearance = defaultAppearance): Appearance {
  if (typeof data !== "object" || data === null) return base;
  const given = data as Record<string, unknown>;
  const accent = hex(given.accent);
  // A new colour brings its own second colour and text colour, or none.
  const colours = accent
    ? { accent, accentTo: hex(given.accentTo), accentInk: hex(given.accentInk) ?? "#ffffff" }
    : { accent: base.accent, accentTo: base.accentTo, accentInk: base.accentInk };
  const logo = "logo" in given ? httpUrl(given.logo) : base.logo;

  return {
    position:
      given.position === "left" || given.position === "right" ? given.position : base.position,
    offsetX: offset(given.offsetX, base.offsetX),
    offsetY: offset(given.offsetY, base.offsetY),
    launcher:
      given.launcher === "logo" || given.launcher === "chat" || given.launcher === "wren"
        ? given.launcher
        : base.launcher,
    accent: colours.accent,
    accentInk: colours.accentInk,
    ...(colours.accentTo ? { accentTo: colours.accentTo } : {}),
    ...(logo ? { logo } : {}),
    name: "name" in given ? (text(given.name, 60) ?? "") : base.name,
    welcome: "welcome" in given ? text(given.welcome, 500) : base.welcome,
    quickReplies: Array.isArray(given.quickReplies)
      ? given.quickReplies.flatMap((reply) => text(reply, 60) ?? []).slice(0, 5)
      : base.quickReplies,
  };
}
