const HOST = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;
const LOCAL = /^(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * The Content-Security-Policy that limits which sites may show the chat in a frame, from the
 * install's allowed domains. Returns `null` when none are set, which means any site may: a new
 * install has to work before anyone has configured it. Entries that are not hosts are skipped.
 */
export function frameAncestorsPolicy(allowedDomains: readonly string[]): string | null {
  const sources = allowedDomains
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => HOST.test(domain))
    // Real sites must use HTTPS. A local address is for development, where there is none.
    .map((domain) => (LOCAL.test(domain) ? `http://${domain}` : `https://${domain}`));

  if (allowedDomains.length === 0) return null;
  // The app itself is always allowed, so the chat still opens in a tab of its own.
  return ["frame-ancestors", "'self'", ...sources].join(" ");
}
