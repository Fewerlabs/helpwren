# Allowed domains

Limit which sites can show your chat and your embedded help center.

With no domains listed, any site can show them. Once you list any, only those sites can.

## Set them

1. As an admin, open **Settings → Installation → Allowed domains**.
2. Under **Domains**, add each site that loads the widget or frames the help center.
3. Save. The change applies to the next page that loads the chat.

| Entry            | Allows                                                              |
| ---------------- | ------------------------------------------------------------------- |
| `example.com`    | `https://example.com`                                               |
| `*.example.com`  | Every subdomain of `example.com`, such as `https://app.example.com` |
| `localhost:4100` | `http://localhost:4100`, for development                            |

Up to 50 entries. A domain is allowed over HTTPS only. Local addresses (`localhost`, names under
it such as `app.localhost`, and `127.0.0.1`) are allowed over HTTP. `*.example.com` does not
include `example.com` itself; list both if you need both.

## How it works

The list becomes the `frame-ancestors` rule of the Content Security Policy on the chat (`/embed`)
and the embedded help center (`/help?embed=1`). The browser then refuses to show either inside a
page from any other site.

> [!NOTE]
> Allowed domains decide where the chat can be shown, not who can call your install's API. The
> API's own checks are the rate limits, spam checks and identity described in
> [Security and abuse protection](index.md).

The live check on the Installation page needs the widget to load on a real site. If it stays on
"Waiting", make sure that site is in the list.
