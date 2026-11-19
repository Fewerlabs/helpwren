/** Longer than any real site's origin; anything longer is not worth keeping. */
const MAX_ORIGIN_LENGTH = 200;

/**
 * The site a widget request came from, for the live install check, or `null` when it is not a
 * real site's: no `Origin` header, something other than a web address, or the install itself,
 * whose Branding preview loads the widget too. Browsers send `Origin` with the widget's
 * cross-site request for its look; anyone can forge one, so it is only ever shown, never trusted.
 */
export function widgetOrigin(request: Request, appUrl: string): string | null {
  const header = request.headers.get("origin");
  if (!header || header.length > MAX_ORIGIN_LENGTH) return null;
  let origin: string;
  try {
    const url = new URL(header);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    origin = url.origin;
  } catch {
    return null;
  }
  return origin === new URL(appUrl).origin ? null : origin;
}
