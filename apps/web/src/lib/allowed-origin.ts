import { frameAncestorSources } from "./frame-ancestors";

/**
 * Whether a browser on `origin` may read an answer meant for the install's sites: one of the
 * allowed domains, under the same rules that decide which sites may frame the chat. With no
 * domains set, any site may, as with the chat. The install itself always may.
 */
export function originAllowed(
  origin: string,
  allowedDomains: readonly string[],
  appUrl: string,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.origin === new URL(appUrl).origin) return true;
  const sources = frameAncestorSources(allowedDomains);
  if (sources === "any") return true;
  return sources.some((source) => {
    const [scheme, host = ""] = source.split("://");
    if (`${scheme}:` !== parsed.protocol) return false;
    const [name = "", port = ""] = host.split(":");
    if (port !== parsed.port) return false;
    if (!name.startsWith("*.")) return name === parsed.hostname;
    return parsed.hostname.endsWith(name.slice(1));
  });
}

/**
 * The headers that let an allowed site read a public answer from its own pages. The answer
 * differs by who asks, so caches keep one per origin.
 */
export function corsHeaders(origin: string | null, methods: string): Record<string, string> {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": methods,
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
