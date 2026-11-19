/**
 * The help center inside a frame on someone else's site. A host asks for it with `?embed=1`
 * and may add a few options. Everything a host sends is checked here, strictly: an option that
 * is not exactly what is expected is dropped, never passed on.
 */

/** The parts of the help center a host may leave out. */
export const EMBED_PARTS = ["search", "collections", "feedback", "chat"] as const;
export type EmbedPart = (typeof EMBED_PARTS)[number];

export interface HelpEmbed {
  /** The parts the host asked to leave out. */
  hide: readonly EmbedPart[];
  /** A colour of the host's own, as six hex digits with the hash, in place of the brand's. */
  accent?: string;
  /** Open on this collection. Only read on the home page. */
  collection?: string;
  /** Open on a search for these words. Only read on the home page. */
  query?: string;
}

/** The header the proxy uses to tell the pages that a request is for the embedded form. */
export const EMBED_HEADER = "x-helpwren-help-embed";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#?[0-9a-f]{6}$/i;

/** What a host asked for, or `null` when the address does not ask for the embedded form. */
export function parseHelpEmbed(params: URLSearchParams): HelpEmbed | null {
  if (params.get("embed") !== "1") return null;

  const asked = (params.get("hide") ?? "").split(",");
  const hide = EMBED_PARTS.filter((part) => asked.includes(part));

  const colour = params.get("accent") ?? "";
  const collection = params.get("collection") ?? "";
  const query = (params.get("q") ?? "").trim().slice(0, 200);

  return {
    hide,
    ...(HEX.test(colour) ? { accent: `#${colour.replace("#", "").toLowerCase()}` } : {}),
    ...(SLUG.test(collection) && collection.length <= 80 ? { collection } : {}),
    ...(query ? { query } : {}),
  };
}

/**
 * The options that travel with every link inside the frame, as a query string with no leading
 * `?`. Where to open is not among them: that is only for the first page.
 */
export function embedQuery(embed: HelpEmbed): string {
  const params = new URLSearchParams({ embed: "1" });
  if (embed.hide.length > 0) params.set("hide", embed.hide.join(","));
  // Without the hash, which would otherwise have to be escaped in an address.
  if (embed.accent) params.set("accent", embed.accent.slice(1));
  return params.toString();
}

/** A path with the embed's options added, so following it stays in the embedded form. */
export function withEmbed(path: string, embed: HelpEmbed | null): string {
  if (!embed) return path;
  const [before, anchor] = path.split("#");
  const joined = `${before}${before?.includes("?") ? "&" : "?"}${embedQuery(embed)}`;
  return anchor === undefined ? joined : `${joined}#${anchor}`;
}
