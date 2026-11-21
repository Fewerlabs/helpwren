# Returning guests

A guest who comes back in the same browser finds their conversations, and is not asked who they
are again.

## How the chat remembers a guest

The chat keeps the guest's session in the browser's storage. The install also gives the browser
a guest key, in a cookie no script can read. If the browser loses the session, because it cleared
the site's storage, or a phone froze the tab at the wrong moment, the key brings the guest's
conversations back the next time the chat opens. The visitor sees nothing of this.

A visitor who logs out of your product, when you [identify your users](../users/index.md) and
call `Helpwren.reset()`, gives the key up, so the next person at a shared computer starts fresh.

## Where the same guest carries over

Browsers keep a page's storage and cookies apart for each site it is shown on. So:

| Where the visitor writes, and where they come back                           | Same guest?                     |
| ---------------------------------------------------------------------------- | ------------------------------- |
| The same page, another tab, or after closing the browser                     | Yes                             |
| Your help center and the chat page (`/help`, `/chat`)                        | Yes                             |
| Your help center and the widget on your own domain, such as `example.com`    | Yes                             |
| The widget on a site with another domain, and your help center               | No: two guests                  |
| Safari, after it clears storage, with the widget on a site of another domain | No: Safari blocks the key there |
| A private window, another browser or another device                          | No                              |

To follow one person everywhere, identify them: the chat then signs them in as your user, on
every device, and what they wrote as a guest becomes theirs.

The design is in [ADR 0029](../decisions/0029-returning-guests.md).
