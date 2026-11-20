# Host it at your own /help

Serve the help center at `https://example.com/help` on your main site, with one rewrite.

A help center on your own domain is better for search: its pages build up your site's standing,
not the install's. Your site passes every request under `/help` on to the install, and the
install renders the pages with your site's address in their links, canonical addresses and
sitemap.

## Before you start

- A site whose server or host can rewrite a path to another address, such as Next.js, Vercel,
  Netlify, Cloudflare or nginx.
- An admin account on your install.

## Set it up

1. Add a rewrite of `/help/:path*` to your install's `/help/:path*`. In Next.js:

   ```js title="next.config.js"
   module.exports = {
     async rewrites() {
       return [{ source: "/help/:path*", destination: "https://support.example.com/help/:path*" }];
     },
   };
   ```

2. In **Settings → Branding → Help center → Search engines**, set **Public address** to
   `https://example.com/help`.
3. Open `https://example.com/help`. Links between pages, canonical addresses and
   `https://example.com/help/sitemap.xml` now use your site's address.

The one rule is enough: everything a help page loads from the install is under `/help` too. Its
scripts and styles are under `/help/_assets` and collection icons under `/help/_icons`. Search
and the chat still talk to the install's own address, which the pages allow.

> [!NOTE]
> Submit `https://example.com/help/sitemap.xml` to search engines, not the install's, once the
> public address is set.

[`examples/nextjs`](../../examples/nextjs) serves the help center this way, and its tests check
it.
