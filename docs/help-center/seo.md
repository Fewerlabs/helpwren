# Search engines

The help center is server-rendered with the metadata, structured data and sitemap search engines
need.

## What every page has

- A title, description and canonical address.
- Open Graph and Twitter card tags, with your logo as the image.
- Structured data: `WebSite` with a search action on the home page, `BreadcrumbList` on
  collections, and `Article` with `BreadcrumbList` on articles.

Pages are rendered on request and kept for 60 seconds; saving an article or the branding clears
them, so changes show on the next visit or the one after.

## Titles and descriptions

| Where                                                  | Field                 | Limit          |
| ------------------------------------------------------ | --------------------- | -------------- |
| **Settings → Branding → Help center → Search engines** | Home page title       | 70 characters  |
|                                                        | Home page description | 200 characters |
| The article editor                                     | Meta title            | 70 characters  |
|                                                        | Meta description      | 200 characters |

An article without its own meta title and description uses its title and summary.

## Sitemap and robots

- `/help/sitemap.xml` lists every collection and published article. Drafts and **Chat only**
  articles are left out.
- `/robots.txt` allows `/help` and `/chat`, and keeps search engines out of the dashboard,
  sign-in, the chat frame, the API, help center searches and previews. It points at the sitemap.

Submit `https://support.example.com/help/sitemap.xml` in Google Search Console and Bing
Webmaster Tools.

## Canonical address

Every page names one canonical address, so it is never indexed twice. By default that is your
install's `/help`. When you [serve the help center at your own site's `/help`](own-site.md), set
**Public address** under **Settings → Branding → Help center → Search engines**, and canonical
addresses, the sitemap and links use it instead.
