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
  /** A chat bubble, or the install's logo when it has one. */
  launcher: "chat" | "logo";
  /** The launcher's colour, as `#rrggbb`. */
  accent: string;
  /** A second colour the launcher fades to. */
  accentTo?: string | undefined;
  /** The colour of the icon on the launcher. */
  accentInk: string;
  /** The address of the install's logo. */
  logo?: string | undefined;
}

export const defaultAppearance: Appearance = {
  position: "right",
  offsetX: 20,
  offsetY: 20,
  launcher: "chat",
  accent: "#3d6b57",
  accentInk: "#ffffff",
};

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_OFFSET = 120;

const hex = (value: unknown): string | undefined =>
  typeof value === "string" && HEX.test(value) ? value : undefined;

const offset = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_OFFSET, Math.max(0, Math.round(value)))
    : fallback;

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
      given.launcher === "logo" || given.launcher === "chat" ? given.launcher : base.launcher,
    accent: colours.accent,
    accentInk: colours.accentInk,
    ...(colours.accentTo ? { accentTo: colours.accentTo } : {}),
    ...(logo ? { logo } : {}),
  };
}
