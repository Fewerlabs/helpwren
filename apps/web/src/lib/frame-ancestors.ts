const HOST = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;
const LOCAL = /^(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * The sites that may show the chat in a frame, as Content-Security-Policy sources, from the
 * install's allowed domains. Returns `"any"` when none are set, which means any site may: a new
 * install has to work before anyone has configured it. Entries that are not hosts are skipped.
 * The app itself is always allowed besides these, so the chat still opens in a tab of its own.
 */
export function frameAncestorSources(allowedDomains: readonly string[]): string[] | "any" {
  const sources = allowedDomains
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => HOST.test(domain))
    // Real sites must use HTTPS. A local address is for development, where there is none.
    .map((domain) => (LOCAL.test(domain) ? `http://${domain}` : `https://${domain}`));

  return allowedDomains.length === 0 ? "any" : sources;
}
