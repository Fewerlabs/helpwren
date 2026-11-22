# Contextual help

Show the help articles that fit the page a visitor is on: in the chat, inside your own page, or in a list you draw yourself.

A page describes the articles it wants with a **filter**. You can set the filter in the page's
code, or let your team map pages to filters with **rules** in the dashboard, so the page needs
no code at all. The same filter drives three ways of showing the results:

1. **In the chat.** The chat's home screen leads with "Help for this page".
2. **Inline.** A `data-helpwren-help` element that the widget script fills with article links.
3. **Your own design.** `GET /api/articles` or `POST /api/articles/search`, or
   `Helpwren.findArticles(filter)`, returns the list for you to draw.

Only published articles are ever returned.

## Tag your articles

Open an article in **Help center** in the dashboard. Besides its collection and tags, the
**Contextual help** part of the side panel holds:

| Field         | What it is                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Audience      | Who the article is for, such as `business`. Empty means everyone                  |
| Language      | A code such as `en` or `pt-br`. Empty means the article is not tied to a language |
| Custom fields | Any name and value of your own, such as `plan` = `pro` or `feature` = `calendar`  |

Audiences use the values your identity adapter gives a signed-in user (Settings > Identity,
"Audience values"). Tags and audiences already in use are suggested as you type.

## Write a filter

Every part is optional, and the parts combine with AND. A page can send something as small as
`{ tags: { any: ["refunds"] } }`.

```js
{
  collection: "bookings",                        // a collection's slug, or a list of them
  tags: { any: ["refunds", "cancellations"] },   // or { all: [...] }, or { none: [...] }
  q: "cancel booking",                           // words the articles must hold
  audience: "business",                          // articles for everyone, or for this audience
  locale: "en",                                  // articles in no language, or in this one
  fields: { plan: "pro" },                       // articles whose custom fields hold every pair
  articles: ["how-refunds-work"],                // slugs to put first, in this order
  sort: "position",                              // or "relevance", "updated", "popular"
  limit: 5                                       // 1 to 50, default 5
}
```

- `tags` can hold more than one of `any`, `all` and `none`.
- `locale: "en"` also takes articles in `en-gb`.
- `articles` puts those articles first, then whatever the rest of the filter picks. With nothing
  else in the filter, you get only those articles.
- `sort` defaults to `relevance` when there is a `q`, and to `position` (the collections' and
  articles' own order) otherwise. `popular` means most often found helpful.

## Set a filter from your page

Pass `filter` to `setContext`. It replaces any rule for this page:

```js
Helpwren.setContext({
  plan: "pro", // shown to your team, as before
  filter: { tags: { any: ["billing"] }, limit: 3 },
});
```

Call it again when the page changes, as in a single-page app. In a React Native app, give the
filter to the support screen:

```tsx
<SupportScreen baseUrl={HELPWREN_URL} source="customer_app" filter={{ collection: "bookings" }} />
```

## Map pages to articles without code

Go to **Settings > Contextual help** and choose **New rule**. A rule says which pages it is for,
and which articles they show:

| When the page              | Matches                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| URL is `/settings/billing` | That path only, with or without a final slash or a query                              |
| URL matches `/bookings/*`  | Any path that fits, where `*` stands for anything. A final `/*` takes `/bookings` too |
| URL contains `checkout`    | Those characters anywhere in the host, path or query                                  |

A value that starts with `/` is compared with the path. Start it with the host, as in
`app.example.com/bookings/*`, to limit a rule to one site. A rule can also be limited to one
audience, such as `business`: it then applies only to signed-in users in it.

Rules are tried from the top, and the first that matches wins. Drag a rule by its handle, or
use Space and the arrow keys on it, to change the order. Switch a rule off to skip it without
deleting it.

**Try a page** below the rules shows what the chat would list for an address, and which rule
chose it. Admins change rules; agents can read them and try pages.

> [!NOTE]
> A filter set by the page always wins over the rules.

## Choose what happens when nothing matches

When there is no page filter and no rule matches, or when they find no articles, the chat
searches for the page's title (or the filter's words, if it had any), with any word counting.
Switch **Search for the page's title** off under **When nothing matches** to show nothing
instead.

## Show the help in the chat

Nothing to do: once a page has a filter or a rule, or the fallback finds something, the chat's
home screen leads with **Help for this page**. The team's featured articles follow under
"Suggested articles", less any already listed. A click opens the article inside the chat.

When the visitor starts a conversation, the filter or the rule that applied, and any fallback
search, is saved with it. Your team sees it under **Help for this page** in the inbox's Details
panel.

## Put a list inside your page

Add an element with the filter as JSON in `data-helpwren-help`, on a page that loads the
widget:

```html
<section>
  <h2>Read more</h2>
  <div data-helpwren-help='{"tags":{"any":["refunds"]},"limit":3}'></div>
</section>
```

When `init` runs, the widget fills each such element, and any added later, with:

```html
<ul class="helpwren-help-list">
  <li class="helpwren-help-item">
    <a class="helpwren-help-link" href="https://example.com/help/billing/how-refunds-work">
      <span class="helpwren-help-title">How refunds work</span>
      <span class="helpwren-help-summary">When the money comes back.</span>
    </a>
  </li>
</ul>
```

The markup carries no styles of its own, so style the classes as you like. Nothing is drawn
while the articles load or when there are none, so the page moves only by the list itself. The
element gets `data-helpwren-state` set to `loading`, `ready`, `empty` or `error`, and
`aria-busy` while it loads. A click opens the article in the chat panel; a click with a
modifier key, or on a page without the chat, follows the link to the help center.

## Draw the list yourself

Ask the install for the list and render it in your own design:

```http
GET /api/articles?collection=bookings&tags=refunds,cancellations&tag_mode=any&audience=business&limit=5
```

| Parameter    | Filter part                                    |
| ------------ | ---------------------------------------------- |
| `collection` | `collection`, comma-separated for several      |
| `tags`       | the tags, comma-separated                      |
| `tag_mode`   | `any` (default), `all` or `none`               |
| `q`          | `q`                                            |
| `audience`   | `audience`                                     |
| `locale`     | `locale`                                       |
| `field.plan` | `fields: { plan: ... }`, one parameter a field |
| `articles`   | `articles`, comma-separated                    |
| `sort`       | `sort`                                         |
| `limit`      | `limit`                                        |

For a filter that does not fit an address, send it whole:

```http
POST /api/articles/search
Content-Type: application/json

{ "filter": { "tags": { "any": ["refunds"], "none": ["internal"] }, "limit": 3 } }
```

Both answer with:

```json
[
  {
    "title": "How refunds work",
    "summary": "When the money comes back.",
    "slug": "how-refunds-work",
    "url": "https://example.com/help/billing/how-refunds-work"
  }
]
```

`url` is the article's help center page, or `null` for an article shown in the chat only. A
browser page may read the answer only from one of the install's allowed domains (Settings >
Installation); any other site gets a 403 and no CORS headers. Requests without an `Origin`,
such as from your server or a native app, are answered. Answers may be kept for a minute, and
each network may ask a few hundred times a minute.

From a page with the widget, the same call is:

```js
const articles = await Helpwren.findArticles({ tags: { any: ["refunds"] }, limit: 3 });
Helpwren.openArticle(articles[0].slug); // opens it in the chat
```

The headless client library has it too, evaluated straight in the database:

```js
const articles = await helpwren.articles.find({ collection: "bookings", limit: 5 });
```

## Open the help for part of your product

A "Help" link beside a page's title can open the chat on that page's collection:

```js
Helpwren.openHelp("catalog"); // straight into the Catalog collection
Helpwren.openHelp(["catalog", "bookings"]); // Help, listing only these two
```

Collections are named by their slug. The back arrow leads to Help, which lists only the
collections you named, and Home is hidden until the visitor closes the chat, so they stay with
the help they asked for. With no collection, `openHelp()` opens Help as it is.

To show the link only where there is something to read, ask first:

```js
const articles = await Helpwren.findArticles({ collection: "catalog" });
if (articles.length > 0) showHelpLink(articles.length);
```

> [!NOTE]
> Article opens are not counted by filter or rule yet, so there is no report of where help
> content is thin.
