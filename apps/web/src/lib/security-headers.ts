/** Cloudflare Turnstile, the captcha an install may switch on for the chat. */
const TURNSTILE = "https://challenges.cloudflare.com";
/** Videos in articles play in YouTube's privacy-enhanced player, and nothing else is framed. */
const YOUTUBE = "https://www.youtube-nocookie.com";

export interface PolicyOptions {
  /** The Supabase project, which the browser reads and listens to. */
  supabaseUrl: string;
  /** The app's own public address, which the help center calls when a host serves it. */
  appUrl: string;
  /**
   * Who may show the page in a frame besides the app itself, or `"any"` for every site.
   * Default: only the app.
   */
  frameAncestors?: readonly string[] | "any";
  /** Development needs `eval` and a socket for reloading. */
  development?: boolean;
}

/** The origin of an address, and its socket twin, for Realtime. */
function origins(url: string): string[] {
  const { origin, protocol, host } = new URL(url);
  return [origin, `${protocol === "https:" ? "wss" : "ws"}://${host}`];
}

/**
 * The Content-Security-Policy for every page. It stops a page loading scripts, frames, forms or
 * connections from anywhere but the app, its Supabase project and the two services it embeds,
 * and plugins and `<base>` tricks altogether.
 *
 * Inline scripts are still allowed: Next.js writes its own into every page, and taking them
 * out needs a nonce on each request, which would stop pages being served from the cache. The
 * rules that keep content from becoming script (React's escaping, the article renderer drawing
 * only the nodes it knows, web addresses only in links) are the defence against that.
 */
export function contentSecurityPolicy({
  supabaseUrl,
  appUrl,
  frameAncestors = [],
  development = false,
}: PolicyOptions): string {
  const supabase = origins(supabaseUrl);
  const app = new URL(appUrl).origin;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(development ? ["'unsafe-eval'"] : []),
      TURNSTILE,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Logos, photos and pictures in articles may be anywhere on the web.
    "img-src": ["'self'", "data:", "blob:", "https:", supabase[0] ?? ""],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", app, ...supabase, ...(development ? ["ws:"] : [])],
    // The app itself by its address too: a help center page served by another site through a
    // rewrite carries this policy, and its chat launcher frames the app.
    "frame-src": ["'self'", app, TURNSTILE, YOUTUBE],
    "media-src": ["'self'", "blob:", "https:"],
    // The dashboard's service worker, /sw.js, and its web app manifest are the app's own.
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Left out altogether when any site may: a page without it can be framed anywhere.
    ...(frameAncestors === "any" ? {} : { "frame-ancestors": ["'self'", ...frameAncestors] }),
  };
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...new Set(sources.filter(Boolean))].join(" "))
    .join("; ");
}

/** Headers for every response, besides the policy above. */
export const BASE_HEADERS = [
  // A file is what its type says, never what a browser guesses from its bytes.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites learn which site sent a visitor, not which page: page addresses can hold ids.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers only keep this from a page served over HTTPS, so it is safe in development.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
] as const;
