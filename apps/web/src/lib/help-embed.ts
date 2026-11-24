import { audienceSchema } from "@helpwren/core";

/**
 * The help center inside a frame on someone else's site. A host asks for it with `?embed=1`
 * and may add a few options. Everything a host sends is checked here, strictly: an option that
 * is not exactly what is expected is dropped, never passed on.
 */

/**
 * The parts of the help center a host may leave out, in the order they appear on a page:
 * the heading and the line under it (home and collection pages), the search, the collection
 * cards and the popular articles (home page), the way back up (collection, article and search
 * pages), and the end of an article: the articles before and after it, whether it helped, and
 * the way to a person.
 */
export const EMBED_PARTS = [
  "title",
  "subtitle",
  "search",
  "collections",
  "popular",
  "breadcrumbs",
  "related",
  "feedback",
  "chat",
] as const;
export type EmbedPart = (typeof EMBED_PARTS)[number];

/** How much room is left around the content: none, a little, or the usual when left out. */
export const EMBED_PADDINGS = ["none", "compact"] as const;
export type EmbedPadding = (typeof EMBED_PADDINGS)[number];

export const EMBED_THEMES = ["light", "dark"] as const;
export type EmbedTheme = (typeof EMBED_THEMES)[number];

export interface HelpEmbed {
  /** The parts the host asked to leave out. */
  hide: readonly EmbedPart[];
  /** A colour of the host's own, as six hex digits with the hash, in place of the brand's. */
  accent?: string;
  /** Less room around the content, to sit inside a host's own padding. */
  padding?: EmbedPadding;
  /** The page behind the content: `transparent`, or six hex digits with the hash. */
  background?: string;
  /** The host's theme, in place of the reader's choice or their device's. */
  theme?: EmbedTheme;
  /** List only the articles for this audience and for everyone. */
  audience?: string;
  /** Open on this collection. Only read on the home page. */
  collection?: string;
  /** Open on a search for these words. Only read on the home page. */
  query?: string;
}

/** The header the proxy uses to tell the pages that a request is for the embedded form. */
export const EMBED_HEADER = "x-helpwren-help-embed";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#?[0-9a-f]{6}$/i;

const hex = (value: string) => `#${value.replace("#", "").toLowerCase()}`;
const oneOf = <T extends string>(list: readonly T[], value: string | null): T | undefined =>
  list.find((item) => item === value);

/** What a host asked for, or `null` when the address does not ask for the embedded form. */
export function parseHelpEmbed(params: URLSearchParams): HelpEmbed | null {
  if (params.get("embed") !== "1") return null;

  const asked = (params.get("hide") ?? "").split(",").map((part) => part.trim().toLowerCase());
  const hide = EMBED_PARTS.filter((part) => asked.includes(part));

  const colour = params.get("accent") ?? "";
  const bg = (params.get("bg") ?? "").toLowerCase();
  const padding = oneOf(EMBED_PADDINGS, params.get("padding"));
  const theme = oneOf(EMBED_THEMES, params.get("theme"));
  const audience = audienceSchema.safeParse(params.get("audience")).data;
  const collection = params.get("collection") ?? "";
  const query = (params.get("q") ?? "").trim().slice(0, 200);

  return {
    hide,
    ...(HEX.test(colour) ? { accent: hex(colour) } : {}),
    ...(padding ? { padding } : {}),
    ...(bg === "transparent" ? { background: bg } : HEX.test(bg) ? { background: hex(bg) } : {}),
    ...(theme ? { theme } : {}),
    ...(audience ? { audience } : {}),
    ...(SLUG.test(collection) && collection.length <= 80 ? { collection } : {}),
    ...(query ? { query } : {}),
  };
}

/** True when the host asked to leave this part out. */
export const hides = (embed: HelpEmbed | null | undefined, part: EmbedPart): boolean =>
  embed?.hide.includes(part) ?? false;

/**
 * The options that travel with every link inside the frame, as a query string with no leading
 * `?`. Where to open is not among them: that is only for the first page.
 */
export function embedQuery(embed: Omit<HelpEmbed, "collection" | "query">): string {
  const params = new URLSearchParams({ embed: "1" });
  if (embed.hide.length > 0) params.set("hide", embed.hide.join(","));
  // Colours go without the hash, which would otherwise have to be escaped in an address.
  if (embed.accent) params.set("accent", embed.accent.slice(1));
  if (embed.padding) params.set("padding", embed.padding);
  if (embed.background) params.set("bg", embed.background.replace("#", ""));
  if (embed.theme) params.set("theme", embed.theme);
  if (embed.audience) params.set("audience", embed.audience);
  // The commas between parts are safe in an address, and easier to read unescaped.
  return params.toString().replaceAll("%2C", ",");
}

/** A path with the embed's options added, so following it stays in the embedded form. */
export function withEmbed(path: string, embed: HelpEmbed | null): string {
  if (!embed) return path;
  const [before, anchor] = path.split("#");
  const joined = `${before}${before?.includes("?") ? "&" : "?"}${embedQuery(embed)}`;
  return anchor === undefined ? joined : `${joined}#${anchor}`;
}
